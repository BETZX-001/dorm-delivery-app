const { admin, db, COLLECTIONS, docData, jsonValue } = require('../db');
const { sendPushNotification } = require('../routes/notifications');

const orders = db.collection(COLLECTIONS.orders);
const slots = db.collection(COLLECTIONS.slots);
const messages = db.collection(COLLECTIONS.messages);
const users = db.collection(COLLECTIONS.users);

async function getParty(orderId, uid) {
  const orderSnapshot = await orders.doc(String(orderId)).get();
  if (!orderSnapshot.exists) return null;
  const order = docData(orderSnapshot, COLLECTIONS.orders);
  const slotSnapshot = await slots.doc(String(order.slot_id)).get();
  if (!slotSnapshot.exists) return null;
  const runnerId = slotSnapshot.data().runner_id;
  if (uid !== order.requester_id && uid !== runnerId) return null;
  return { order, runnerId };
}

async function getMessages(req, res) {
  try {
    const party = await getParty(req.params.orderId, req.user.uid);
    if (!party) return res.status(404).json({ error: 'ไม่พบออเดอร์หรือคุณไม่มีสิทธิ์ดูแชทนี้' });
    const snapshot = await messages.where('order_id', '==', String(req.params.orderId)).get();
    const readAt = admin.firestore.Timestamp.now();
    const unread = snapshot.docs.filter((doc) => doc.data().sender_id !== req.user.uid && !doc.data().read_at);
    if (unread.length) {
      const batch = db.batch();
      unread.forEach((doc) => batch.update(doc.ref, { read_at: readAt }));
      await batch.commit();
    }
    const rows = snapshot.docs.map((doc) => ({
      message_id: doc.id,
      ...docData(doc),
      ...(unread.some((item) => item.id === doc.id) ? { read_at: jsonValue(readAt) } : {}),
    }))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return res.json({ messages: rows, order_status: party.order.order_status });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'โหลดข้อความไม่สำเร็จ' });
  }
}

async function getUnread(req, res) {
  try {
    const snapshot = await messages.where('recipient_id', '==', req.user.uid).get();
    const byOrder = {};
    snapshot.docs.forEach((doc) => {
      const message = doc.data();
      if (!message.read_at) byOrder[String(message.order_id)] = (byOrder[String(message.order_id)] || 0) + 1;
    });
    return res.json({ total: Object.values(byOrder).reduce((sum, count) => sum + count, 0), by_order: byOrder });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'โหลดจำนวนข้อความใหม่ไม่สำเร็จ' });
  }
}

async function sendMessage(req, res) {
  const text = req.body.text?.trim();
  if (!text) return res.status(400).json({ error: 'กรุณาพิมพ์ข้อความ' });
  if (text.length > 500) return res.status(400).json({ error: 'ข้อความยาวเกิน 500 ตัวอักษร' });
  try {
    const party = await getParty(req.params.orderId, req.user.uid);
    if (!party) return res.status(404).json({ error: 'ไม่พบออเดอร์หรือคุณไม่มีสิทธิ์ส่งข้อความ' });
    if (['COMPLETED', 'REJECTED'].includes(party.order.order_status)) {
      return res.status(409).json({ error: 'ออร์เดอร์สิ้นสุดแล้ว ไม่สามารถส่งข้อความเพิ่มเติมได้' });
    }
    const ref = messages.doc();
    const recipientId = req.user.uid === party.order.requester_id ? party.runnerId : party.order.requester_id;
    const createdAt = admin.firestore.Timestamp.now();
    const payload = {
      order_id: String(req.params.orderId), sender_id: req.user.uid, recipient_id: recipientId,
      text, read_at: null, created_at: createdAt,
    };
    await ref.set(payload);
    const recipient = await users.doc(String(recipientId)).get();
    await sendPushNotification({
      pushToken: recipient.data()?.push_token, title: 'ข้อความใหม่เกี่ยวกับออเดอร์',
      body: text.length > 80 ? `${text.slice(0, 80)}…` : text,
      data: { type: 'CHAT_MESSAGE', order_id: party.order.order_id },
    });
    return res.status(201).json({ message: { message_id: ref.id, ...jsonValue(payload) } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ส่งข้อความไม่สำเร็จ' });
  }
}

module.exports = { getMessages, getUnread, sendMessage };
