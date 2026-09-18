const {
  admin, db, COLLECTIONS, normalizeId, asTimestamp, docData, docsByIds, nextNumericId,
} = require('../db');

const slots = db.collection(COLLECTIONS.slots);
const orders = db.collection(COLLECTIONS.orders);
const users = db.collection(COLLECTIONS.users);
const ACTIVE_ORDER_STATUSES = new Set(['PENDING', 'ACCEPTED', 'SHOPPING', 'WAITING', 'DELIVERING']);

function byDate(field, direction = 1) {
  return (a, b) => direction * (new Date(a[field]).getTime() - new Date(b[field]).getTime());
}

async function reconcileSlotCapacity(runnerId = null) {
  const [slotSnapshot, orderSnapshot] = await Promise.all([
    runnerId ? slots.where('runner_id', '==', runnerId).get() : slots.get(),
    orders.get(),
  ]);
  const activeCounts = new Map();
  orderSnapshot.docs.forEach((doc) => {
    const order = doc.data();
    if (ACTIVE_ORDER_STATUSES.has(order.order_status)) {
      const key = String(order.slot_id);
      activeCounts.set(key, (activeCounts.get(key) || 0) + 1);
    }
  });

  const now = Date.now();
  const batch = db.batch();
  let writes = 0;
  slotSnapshot.docs.forEach((doc) => {
    const slot = doc.data();
    const count = activeCounts.get(String(slot.slot_id ?? doc.id)) || 0;
    let status = slot.status;
    const cutOff = slot.cut_off_time?.toDate?.().getTime() ?? new Date(slot.cut_off_time).getTime();
    if (cutOff <= now && count === 0) status = 'COMPLETED';
    else if (status === 'FULL' && count < Number(slot.max_orders)) status = 'OPEN';
    if (count !== Number(slot.current_orders || 0) || status !== slot.status) {
      batch.update(doc.ref, { current_orders: count, status, updated_at: admin.firestore.Timestamp.now() });
      writes += 1;
    }
  });
  if (writes) await batch.commit();
}

async function createSlot(req, res) {
  const { uid } = req.user;
  const { destination, start_time, cut_off_time, max_orders, fee } = req.body;
  if (!destination || !cut_off_time || !max_orders) return res.status(400).json({ error: 'destination, cut_off_time and max_orders are required' });
  if (Number(max_orders) < 1) return res.status(400).json({ error: 'max_orders must be at least 1' });
  if (fee !== undefined && Number(fee) < 0) return res.status(400).json({ error: 'fee cannot be negative' });

  const startDate = start_time ? new Date(start_time) : new Date(new Date(cut_off_time).getTime() - 2 * 60 * 60 * 1000);
  const cutOffDate = new Date(cut_off_time);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(cutOffDate.getTime())) return res.status(400).json({ error: 'start_time and cut_off_time must be valid dates' });
  if (startDate <= new Date()) return res.status(400).json({ error: 'start_time must be in the future' });
  if (cutOffDate <= new Date()) return res.status(400).json({ error: 'cut_off_time must be in the future' });
  if (startDate >= cutOffDate) return res.status(400).json({ error: 'start_time must be before cut_off_time' });

  try {
    let id;
    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(users.doc(uid));
      if (!userSnapshot.exists) {
        const error = new Error('User profile not found'); error.status = 404; throw error;
      }
      id = await nextNumericId(transaction, 'slots');
      transaction.set(slots.doc(String(id)), {
        slot_id: id, runner_id: uid, destination: destination.trim(),
        dorm_name: userSnapshot.data().dorm_name, start_time: asTimestamp(startDate),
        cut_off_time: asTimestamp(cutOffDate), max_orders: Number(max_orders), current_orders: 0,
        fee: Number(fee || 0), status: 'OPEN', created_at: admin.firestore.Timestamp.now(),
      });
    });
    return res.status(201).json({ slot: docData(await slots.doc(String(id)).get(), COLLECTIONS.slots) });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to create slot' });
  }
}

async function withRunnerDetails(slotRows) {
  const userMap = await docsByIds(COLLECTIONS.users, slotRows.map((slot) => slot.runner_id));
  return slotRows.map((slot) => {
    const runner = userMap.get(String(slot.runner_id)) || {};
    return { ...slot, runner_name: runner.name, runner_rating: Number(runner.avg_rating || 0), runner_profile_image: runner.profile_image || null };
  });
}

async function getAvailableSlots(req, res) {
  const { uid } = req.user;
  const requestedStatus = ['OPEN', 'FULL'].includes(req.query.status) ? req.query.status : null;
  const query = String(req.query.q || '').trim().toLowerCase();
  try {
    const snapshot = await slots.get();
    let rows = snapshot.docs.map((doc) => docData(doc, COLLECTIONS.slots))
      .filter((slot) => !slot.deleted_at && slot.runner_id !== uid && ['OPEN', 'FULL'].includes(slot.status))
      .filter((slot) => new Date(slot.cut_off_time) > new Date())
      .filter((slot) => !requestedStatus || slot.status === requestedStatus);
    rows = await withRunnerDetails(rows);
    if (query) rows = rows.filter((slot) => slot.destination?.toLowerCase().includes(query) || slot.runner_name?.toLowerCase().includes(query));
    rows.sort(byDate('cut_off_time'));
    return res.json({ slots: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch available slots' });
  }
}

async function getMySlots(req, res) {
  try {
    const snapshot = await slots.where('runner_id', '==', req.user.uid).get();
    let rows = snapshot.docs.map((doc) => docData(doc, COLLECTIONS.slots))
      .filter((slot) => !slot.deleted_at && new Date(slot.cut_off_time) > new Date())
      .sort(byDate('created_at', -1));
    rows = await withRunnerDetails(rows);
    return res.json({ slots: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch slots' });
  }
}

async function getSlotById(req, res) {
  try {
    const snapshot = await slots.doc(String(req.params.slotId)).get();
    if (!snapshot.exists || snapshot.data().deleted_at) return res.status(404).json({ error: 'Slot not found' });
    const [slot] = await withRunnerDetails([docData(snapshot, COLLECTIONS.slots)]);
    return res.json({ slot });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch slot' });
  }
}

async function updateSlotStatus(req, res) {
  const { status } = req.body;
  if (!['OPEN', 'FULL', 'SHOPPING', 'COMPLETED'].includes(status)) return res.status(400).json({ error: 'Invalid slot status' });
  try {
    const ref = slots.doc(String(req.params.slotId));
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) { const error = new Error('Slot not found'); error.status = 404; throw error; }
      if (snapshot.data().runner_id !== req.user.uid) { const error = new Error('Only the owning runner can update this slot'); error.status = 403; throw error; }
      transaction.update(ref, { status, updated_at: admin.firestore.Timestamp.now() });
    });
    return res.json({ slot: docData(await ref.get(), COLLECTIONS.slots) });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to update slot status' });
  }
}

async function activeOrdersForSlot(slotId) {
  const snapshot = await orders.where('slot_id', '==', normalizeId(slotId)).get();
  return snapshot.docs.filter((doc) => ACTIVE_ORDER_STATUSES.has(doc.data().order_status));
}

async function updateSlot(req, res) {
  const { destination, cut_off_time, max_orders, fee } = req.body;
  if (!destination || !cut_off_time || !max_orders) return res.status(400).json({ error: 'destination, cut_off_time and max_orders are required' });
  if (Number(max_orders) < 1 || Number(fee) < 0) return res.status(400).json({ error: 'max_orders must be at least 1 and fee cannot be negative' });
  try {
    const ref = slots.doc(String(req.params.slotId));
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Slot not found' });
    if (snapshot.data().runner_id !== req.user.uid) return res.status(403).json({ error: 'Only the owning runner can edit this slot' });
    if ((await activeOrdersForSlot(req.params.slotId)).length) return res.status(409).json({ error: 'แก้ไขรอบไม่ได้ระหว่างยังมีออร์เดอร์ที่กำลังดำเนินการอยู่' });
    const cutOff = asTimestamp(cut_off_time);
    if (!cutOff) return res.status(400).json({ error: 'cut_off_time must be a valid date' });
    await ref.update({ destination: destination.trim(), cut_off_time: cutOff, max_orders: Number(max_orders), fee: Number(fee), updated_at: admin.firestore.Timestamp.now() });
    return res.json({ slot: docData(await ref.get(), COLLECTIONS.slots) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update slot' });
  }
}

async function deleteSlot(req, res) {
  try {
    const ref = slots.doc(String(req.params.slotId));
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Slot not found' });
    if (snapshot.data().runner_id !== req.user.uid) return res.status(403).json({ error: 'Only the owning runner can delete this slot' });
    if ((await activeOrdersForSlot(req.params.slotId)).length) return res.status(409).json({ error: 'ลบรอบไม่ได้ระหว่างยังมีออร์เดอร์ที่กำลังดำเนินการอยู่' });
    // Soft-delete keeps completed order history and references intact.
    await ref.update({ deleted_at: admin.firestore.Timestamp.now(), status: 'COMPLETED', updated_at: admin.firestore.Timestamp.now() });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete slot' });
  }
}

module.exports = { createSlot, getAvailableSlots, getMySlots, getSlotById, updateSlotStatus, updateSlot, deleteSlot, reconcileSlotCapacity };
