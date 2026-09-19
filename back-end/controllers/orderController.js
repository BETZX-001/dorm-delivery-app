const {
  admin, db, COLLECTIONS, normalizeId, docData, docsByIds, docsByIdsSelected, nextNumericId,
} = require('../db');
const { calculateEta, sendPushNotification } = require('../routes/notifications');

const orders = db.collection(COLLECTIONS.orders);
const slots = db.collection(COLLECTIONS.slots);
const users = db.collection(COLLECTIONS.users);
const reviews = db.collection(COLLECTIONS.reviews);
const STATE_MACHINE = {
  PENDING: ['ACCEPTED', 'REJECTED'], ACCEPTED: ['SHOPPING'], SHOPPING: ['WAITING'],
  WAITING: ['DELIVERING'], DELIVERING: ['COMPLETED'], REJECTED: [], COMPLETED: [],
};
const ACTIVE = new Set(['PENDING', 'ACCEPTED', 'SHOPPING', 'WAITING', 'DELIVERING']);
const STATUS_ORDER = ['PENDING', 'ACCEPTED', 'SHOPPING', 'WAITING', 'DELIVERING', 'COMPLETED', 'REJECTED'];
const STATUS_MESSAGE = {
  ACCEPTED: 'ผู้รับหิ้วรับออเดอร์ของคุณแล้ว', REJECTED: 'ผู้รับหิ้วปฏิเสธออเดอร์ของคุณ',
  SHOPPING: 'ผู้รับหิ้วกำลังซื้อสินค้าให้คุณ', WAITING: 'ผู้รับหิ้วได้รับสินค้าแล้ว',
  DELIVERING: 'ผู้รับหิ้วกำลังนำสินค้าไปส่ง', COMPLETED: 'ออเดอร์ของคุณส่งสำเร็จแล้ว',
};

function newestFirst(a, b) { return new Date(b.created_at) - new Date(a.created_at); }

async function placeOrder(req, res) {
  const { uid } = req.user;
  const { slot_id, item_name, quantity, note } = req.body;
  if (slot_id == null || !item_name || !quantity) return res.status(400).json({ error: 'slot_id, item_name and quantity are required' });
  if (Number(quantity) < 1) return res.status(400).json({ error: 'quantity must be at least 1' });

  try {
    let orderId;
    await db.runTransaction(async (transaction) => {
      const slotRef = slots.doc(String(slot_id));
      const slotSnapshot = await transaction.get(slotRef);
      if (!slotSnapshot.exists || slotSnapshot.data().deleted_at) { const error = new Error('Slot not found'); error.status = 404; throw error; }
      const slot = slotSnapshot.data();
      if (slot.status !== 'OPEN') { const error = new Error('Slot is not open for new orders'); error.status = 409; throw error; }
      if (slot.cut_off_time.toDate() <= new Date()) { const error = new Error('Slot cut-off time has passed'); error.status = 409; throw error; }
      if (Number(slot.current_orders || 0) >= Number(slot.max_orders)) { const error = new Error('Slot is already full'); error.status = 409; throw error; }
      if (slot.runner_id === uid) { const error = new Error('Runner cannot order on their own slot'); error.status = 400; throw error; }

      orderId = await nextNumericId(transaction, 'orders');
      const newCount = Number(slot.current_orders || 0) + 1;
      transaction.set(orders.doc(String(orderId)), {
        order_id: orderId, slot_id: normalizeId(slot_id), requester_id: uid, runner_id: slot.runner_id,
        item_name: item_name.trim(), quantity: Number(quantity), note: note || null,
        order_status: 'PENDING', created_at: admin.firestore.Timestamp.now(),
      });
      transaction.update(slotRef, {
        current_orders: newCount,
        status: newCount >= Number(slot.max_orders) ? 'FULL' : 'OPEN',
        updated_at: admin.firestore.Timestamp.now(),
      });
    });
    const createdOrder = docData(await orders.doc(String(orderId)).get(), COLLECTIONS.orders);
    const slot = docData(await slots.doc(String(slot_id)).get(), COLLECTIONS.slots);
    const runner = slot?.runner_id ? await users.doc(String(slot.runner_id)).get() : null;
    void sendPushNotification({
      pushToken: runner?.data()?.push_token, title: 'มีออเดอร์ใหม่',
      body: `${item_name.trim()} × ${Number(quantity)} มีผู้ฝากซื้อเข้ามา`,
      data: { order_id: orderId, slot_id: normalizeId(slot_id), type: 'ORDER_CREATED' },
    });
    return res.status(201).json({ order: createdOrder });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to place order' });
  }
}

async function hydrateOrders(rows, includeContact = false, includeImages = false) {
  const slotMap = await docsByIds(COLLECTIONS.slots, rows.map((order) => order.slot_id));
  const userFields = ['name', 'avg_rating', 'phone', 'dorm_name', 'room_number', ...(includeImages ? ['profile_image'] : [])];
  const [runnerMap, requesterMap] = await Promise.all([
    docsByIdsSelected(COLLECTIONS.users, [...slotMap.values()].map((slot) => slot.runner_id), userFields),
    docsByIdsSelected(COLLECTIONS.users, rows.map((order) => order.requester_id), userFields),
  ]);
  return rows.map((order) => {
    const slot = slotMap.get(String(order.slot_id)) || {};
    const runner = runnerMap.get(String(slot.runner_id)) || {};
    const requester = requesterMap.get(String(order.requester_id)) || {};
    const contactAllowed = ACTIVE.has(order.order_status);
    return {
      ...order, destination: slot.destination, cut_off_time: slot.cut_off_time,
      slot_status: slot.status, fee: Number(slot.fee || 0), runner_id: slot.runner_id,
      runner_name: runner.name, runner_rating: Number(runner.avg_rating || 0),
      runner_profile_image: includeImages ? runner.profile_image || null : undefined,
      runner_phone: includeContact && contactAllowed ? runner.phone || null : undefined,
      requester_name: requester.name, dorm_name: requester.dorm_name, room_number: requester.room_number,
      requester_profile_image: includeImages ? requester.profile_image || null : undefined,
      requester_phone: includeContact && contactAllowed ? requester.phone || null : undefined,
    };
  });
}

async function getMyOrders(req, res) {
  try {
    const [snapshot, reviewSnapshot] = await Promise.all([
      orders.where('requester_id', '==', req.user.uid).get(),
      reviews.where('reviewer_id', '==', req.user.uid).get(),
    ]);
    const rows = snapshot.docs.map((doc) => docData(doc, COLLECTIONS.orders)).sort(newestFirst);
    const reviewedOrderIds = new Set(reviewSnapshot.docs.map((doc) => String(doc.data().order_id)));
    const hydrated = await hydrateOrders(rows);
    return res.json({ orders: hydrated.map((order) => ({ ...order, has_review: reviewedOrderIds.has(String(order.order_id)) })) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

async function getOrderById(req, res) {
  try {
    const snapshot = await orders.doc(String(req.params.orderId)).get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Order not found' });
    const order = docData(snapshot, COLLECTIONS.orders);
    const [hydrated] = await hydrateOrders([order], true, true);
    if (order.requester_id !== req.user.uid && hydrated.runner_id !== req.user.uid) return res.status(404).json({ error: 'Order not found' });
    return res.json({ order: hydrated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
}

async function getRunnerOrders(req, res) {
  try {
    const slotSnapshot = await slots.where('runner_id', '==', req.user.uid).get();
    const slotIds = slotSnapshot.docs.map((doc) => normalizeId(doc.data().slot_id ?? doc.id));
    const snapshots = [];
    for (let index = 0; index < slotIds.length; index += 30) {
      snapshots.push(await orders.where('slot_id', 'in', slotIds.slice(index, index + 30)).get());
    }
    const direct = await orders.where('runner_id', '==', req.user.uid).get();
    const unique = new Map([...snapshots.flatMap((snapshot) => snapshot.docs), ...direct.docs].map((doc) => [doc.id, docData(doc, COLLECTIONS.orders)]));
    const rows = [...unique.values()];
    const hydrated = await hydrateOrders(rows, true);
    hydrated.sort((a, b) => STATUS_ORDER.indexOf(a.order_status) - STATUS_ORDER.indexOf(b.order_status) || newestFirst(a, b));
    return res.json({ orders: hydrated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ไม่สามารถโหลดออร์เดอร์ของผู้รับหิ้วได้' });
  }
}

async function getOrdersForSlot(req, res) {
  try {
    const slotSnapshot = await slots.doc(String(req.params.slotId)).get();
    if (!slotSnapshot.exists) return res.status(404).json({ error: 'Slot not found' });
    if (slotSnapshot.data().runner_id !== req.user.uid) return res.status(403).json({ error: 'Only the owning runner can view these orders' });
    const snapshot = await orders.where('slot_id', '==', normalizeId(req.params.slotId)).get();
    const rows = snapshot.docs.map((doc) => docData(doc, COLLECTIONS.orders)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return res.json({ orders: await hydrateOrders(rows, true, true) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch orders for slot' });
  }
}

async function updateOrderStatus(req, res) {
  const { order_status } = req.body;
  let original;
  let statusChanged = false;
  try {
    const orderRef = orders.doc(String(req.params.orderId));
    await db.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) { const error = new Error('Order not found'); error.status = 404; throw error; }
      original = { ...orderSnapshot.data(), order_id: normalizeId(orderSnapshot.id) };
      const slotRef = slots.doc(String(original.slot_id));
      const slotSnapshot = await transaction.get(slotRef);
      if (!slotSnapshot.exists) { const error = new Error('Slot not found'); error.status = 404; throw error; }
      if (slotSnapshot.data().runner_id !== req.user.uid) { const error = new Error('Only the owning runner can update this order'); error.status = 403; throw error; }
      // Treat retries as success. Mobile users can tap twice while a sleeping
      // Render instance is waking up; the first request may already have
      // committed even though the second request reaches the server too.
      if (original.order_status === order_status) return;
      const allowedNext = STATE_MACHINE[original.order_status] || [];
      if (!allowedNext.includes(order_status)) {
        const error = new Error(`Cannot move order from ${original.order_status} to ${order_status}`);
        error.status = 409; error.allowedNext = allowedNext; throw error;
      }
      statusChanged = true;
      transaction.update(orderRef, { order_status, updated_at: admin.firestore.Timestamp.now() });
      if (order_status === 'REJECTED' || order_status === 'COMPLETED') {
        const slot = slotSnapshot.data();
        const newCount = Math.max(Number(slot.current_orders || 0) - 1, 0);
        const cutOffPassed = slot.cut_off_time.toDate() <= new Date();
        transaction.update(slotRef, {
          current_orders: newCount,
          status: cutOffPassed ? 'COMPLETED' : slot.status === 'FULL' ? 'OPEN' : slot.status,
          updated_at: admin.firestore.Timestamp.now(),
        });
      }
    });

    let etaPayload = null;
    if (!statusChanged) {
      return res.json({ order: docData(await orderRef.get(), COLLECTIONS.orders), eta: etaPayload, unchanged: true });
    }
    if (order_status === 'DELIVERING') {
      const sameSlot = await orders.where('slot_id', '==', original.slot_id).get();
      const activeCount = sameSlot.docs.filter((doc) => ACTIVE.has(doc.data().order_status)).length;
      const { etaMinutes, etaTime } = calculateEta({ pendingOrderCount: activeCount });
      etaPayload = { etaMinutes, etaTime };
      const requester = await users.doc(original.requester_id).get();
      void sendPushNotification({
        pushToken: requester.data()?.push_token,
        title: 'Your order is on the way!',
        body: `${original.item_name} is out for delivery — ETA ~${etaMinutes} min.`,
        data: { order_id: original.order_id, eta_minutes: etaMinutes },
      });
    }
    if (order_status !== 'DELIVERING') {
      const requester = await users.doc(String(original.requester_id)).get();
      void sendPushNotification({
        pushToken: requester.data()?.push_token,
        title: 'อัปเดตสถานะออเดอร์',
        body: STATUS_MESSAGE[order_status] || `สถานะออเดอร์เปลี่ยนเป็น ${order_status}`,
        data: { order_id: original.order_id, status: order_status, type: 'ORDER_STATUS' },
      });
    }
    return res.json({ order: docData(await orderRef.get(), COLLECTIONS.orders), eta: etaPayload });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to update order status', ...(error.allowedNext ? { allowedNext: error.allowedNext } : {}) });
  }
}

module.exports = { placeOrder, getMyOrders, getOrderById, getRunnerOrders, getOrdersForSlot, updateOrderStatus };
