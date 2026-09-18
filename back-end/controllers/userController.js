const { admin, db, COLLECTIONS, docData, docsByIds } = require('../db');
const { UNIVERSITY_EMAIL_DOMAIN } = require('../authMiddleware');

const users = db.collection(COLLECTIONS.users);
const orders = db.collection(COLLECTIONS.orders);
const slots = db.collection(COLLECTIONS.slots);
const ACTIVE_STATUSES = new Set(['PENDING', 'ACCEPTED', 'SHOPPING', 'WAITING', 'DELIVERING']);
const GENDERS = new Set(['MALE', 'FEMALE', 'LGBTQ_PLUS', 'UNSPECIFIED']);

async function syncUser(req, res) {
  const { uid, email } = req.user;
  const { name, phone, gender, dorm_name, room_number, role } = req.body;
  if (!name || !dorm_name || !gender) return res.status(400).json({ error: 'name, gender and dorm_name are required' });
  if (!GENDERS.has(gender)) return res.status(400).json({ error: 'ข้อมูลเพศไม่ถูกต้อง' });
  if (role && !['RUNNER', 'REQUESTER'].includes(role)) return res.status(400).json({ error: 'role must be RUNNER or REQUESTER' });

  try {
    const ref = users.doc(uid);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const existing = snapshot.data() || {};
      transaction.set(ref, {
        user_id: uid,
        name: name.trim(),
        email,
        phone: phone?.trim() || null,
        gender,
        dorm_name: dorm_name.trim(),
        room_number: room_number?.trim() || null,
        role: existing.role || role || 'REQUESTER',
        avg_rating: Number(existing.avg_rating || 0),
        created_at: existing.created_at || admin.firestore.Timestamp.now(),
        updated_at: admin.firestore.Timestamp.now(),
      }, { merge: true });
    });
    return res.json({ user: docData(await ref.get(), COLLECTIONS.users) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to sync user' });
  }
}

async function switchRole(req, res) {
  const { uid } = req.user;
  const { role } = req.body;
  if (!['RUNNER', 'REQUESTER'].includes(role)) return res.status(400).json({ error: 'role must be RUNNER or REQUESTER' });
  try {
    const ref = users.doc(uid);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'User profile not found, call /sync first' });
    await ref.update({ role, updated_at: admin.firestore.Timestamp.now() });
    return res.json({ user: docData(await ref.get(), COLLECTIONS.users) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to switch role' });
  }
}

async function getMe(req, res) {
  try {
    const snapshot = await users.doc(req.user.uid).get();
    if (!snapshot.exists) return res.status(404).json({ error: 'User profile not found, call /sync first' });
    return res.json({ user: docData(snapshot, COLLECTIONS.users) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

async function getPublicProfile(req, res) {
  try {
    const userId = String(req.params.userId);
    const userSnapshot = await users.doc(userId).get();
    if (!userSnapshot.exists) return res.status(404).json({ error: 'ไม่พบโปรไฟล์ผู้ใช้งาน' });
    const [runnerSnapshot, requesterSnapshot, slotSnapshot] = await Promise.all([
      orders.where('runner_id', '==', userId).get(),
      orders.where('requester_id', '==', userId).get(),
      slots.where('runner_id', '==', userId).get(),
    ]);
    // Older migrated orders did not store runner_id directly; their runner is
    // determined by the owning slot. Merge both shapes and deduplicate by doc id.
    const runnerOrderDocs = new Map(runnerSnapshot.docs.map((doc) => [doc.id, doc]));
    const runnerSlotIds = slotSnapshot.docs.map((doc) => doc.data().slot_id ?? Number(doc.id));
    for (let index = 0; index < runnerSlotIds.length; index += 30) {
      const chunk = runnerSlotIds.slice(index, index + 30);
      if (!chunk.length) continue;
      const legacySnapshot = await orders.where('slot_id', 'in', chunk).get();
      legacySnapshot.docs.forEach((doc) => runnerOrderDocs.set(doc.id, doc));
    }
    const runnerOrders = [...runnerOrderDocs.values()].map((doc) => docData(doc, COLLECTIONS.orders));
    const requesterOrders = requesterSnapshot.docs.map((doc) => docData(doc, COLLECTIONS.orders));
    const slotMap = new Map(slotSnapshot.docs.map((doc) => [String(doc.id), docData(doc, COLLECTIONS.slots)]));
    const requesterSlotMap = await docsByIds(COLLECTIONS.slots, requesterOrders.map((order) => order.slot_id));
    requesterSlotMap.forEach((slot, id) => slotMap.set(String(id), slot));
    const currentOrders = runnerOrders
      .filter((order) => ACTIVE_STATUSES.has(order.order_status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((order) => ({
        order_id: order.order_id,
        order_status: order.order_status,
        destination: slotMap.get(String(order.slot_id))?.destination || '-',
        created_at: order.created_at,
      }));
    const currentRequesterOrders = requesterOrders
      .filter((order) => ACTIVE_STATUSES.has(order.order_status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((order) => ({
        order_id: order.order_id,
        order_status: order.order_status,
        destination: slotMap.get(String(order.slot_id))?.destination || '-',
        created_at: order.created_at,
      }));
    const user = docData(userSnapshot, COLLECTIONS.users);
    return res.json({
      profile: { user_id: user.user_id, name: user.name, profile_image: user.profile_image || null, avg_rating: Number(user.avg_rating || 0), dorm_name: user.dorm_name || null },
      stats: {
        runner_completed: runnerOrders.filter((order) => order.order_status === 'COMPLETED').length,
        requester_completed: requesterOrders.filter((order) => order.order_status === 'COMPLETED').length,
        runner_history: runnerOrders.filter((order) => ['COMPLETED', 'REJECTED'].includes(order.order_status)).length,
        requester_history: requesterOrders.filter((order) => ['COMPLETED', 'REJECTED'].includes(order.order_status)).length,
        active_runner_orders: runnerOrders.filter((order) => ACTIVE_STATUSES.has(order.order_status)).length,
        active_requester_orders: requesterOrders.filter((order) => ACTIVE_STATUSES.has(order.order_status)).length,
      },
      current_orders: currentOrders,
      current_requester_orders: currentRequesterOrders,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'โหลดโปรไฟล์ไม่สำเร็จ' });
  }
}

async function updateMe(req, res) {
  const { uid } = req.user;
  const { name, phone, gender, dorm_name, room_number } = req.body;
  if (!name?.trim() || !gender || !dorm_name?.trim()) return res.status(400).json({ error: 'กรุณาระบุชื่อ เพศ และหอพัก' });
  if (!GENDERS.has(gender)) return res.status(400).json({ error: 'ข้อมูลเพศไม่ถูกต้อง' });
  try {
    const ref = users.doc(uid);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'User profile not found' });
    await ref.update({
      name: name.trim(), phone: phone?.trim() || null, gender, dorm_name: dorm_name.trim(),
      room_number: room_number?.trim() || null, updated_at: admin.firestore.Timestamp.now(),
    });
    return res.json({ user: docData(await ref.get(), COLLECTIONS.users) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'อัปเดตข้อมูลส่วนตัวไม่สำเร็จ' });
  }
}

async function updateProfileImage(req, res) {
  const { uid } = req.user;
  const { profile_image } = req.body;
  if (typeof profile_image !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(profile_image)) {
    return res.status(400).json({ error: 'รูปโปรไฟล์ไม่ถูกต้อง' });
  }
  // A Firestore document has a 1 MiB limit; keep headroom for the remaining profile fields.
  if (Buffer.byteLength(profile_image, 'utf8') > 750_000) {
    return res.status(413).json({ error: 'รูปโปรไฟล์มีขนาดใหญ่เกินไป กรุณาเลือกรูปอื่น' });
  }
  try {
    const ref = users.doc(uid);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'User profile not found' });
    await ref.update({ profile_image, updated_at: admin.firestore.Timestamp.now() });
    return res.json({ user: docData(await ref.get(), COLLECTIONS.users) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'อัปเดตรูปโปรไฟล์ไม่สำเร็จ' });
  }
}

async function updatePushToken(req, res) {
  const { push_token } = req.body;
  if (!push_token) return res.status(400).json({ error: 'push_token is required' });
  try {
    await users.doc(req.user.uid).update({ push_token, updated_at: admin.firestore.Timestamp.now() });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update push token' });
  }
}

module.exports = { syncUser, switchRole, getMe, getPublicProfile, updateMe, updateProfileImage, updatePushToken, UNIVERSITY_EMAIL_DOMAIN };
