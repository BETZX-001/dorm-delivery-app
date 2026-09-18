const { admin, db, COLLECTIONS, normalizeId, docData, nextNumericId } = require('../db');

const reports = db.collection(COLLECTIONS.reports);
const orders = db.collection(COLLECTIONS.orders);
const slots = db.collection(COLLECTIONS.slots);
const CATEGORIES = ['LATE_DELIVERY', 'ITEM_ISSUE', 'PAYMENT_DISPUTE', 'BEHAVIOR', 'OTHER'];

async function createReport(req, res) {
  const { uid } = req.user;
  const { order_id, category, description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'description is required' });
  if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: `category must be one of ${CATEGORIES.join(', ')}` });
  try {
    let id;
    await db.runTransaction(async (transaction) => {
      if (order_id != null) {
        const orderSnapshot = await transaction.get(orders.doc(String(order_id)));
        if (!orderSnapshot.exists) { const error = new Error('Order not found'); error.status = 404; throw error; }
        const order = orderSnapshot.data();
        let runnerId = order.runner_id;
        if (!runnerId && order.slot_id != null) {
          const slotSnapshot = await transaction.get(slots.doc(String(order.slot_id)));
          runnerId = slotSnapshot.data()?.runner_id;
        }
        if (order.requester_id !== uid && runnerId !== uid) {
          const error = new Error('คุณรายงานได้เฉพาะออเดอร์ที่เกี่ยวข้องกับคุณ'); error.status = 403; throw error;
        }
      }
      id = await nextNumericId(transaction, 'reports');
      transaction.set(reports.doc(String(id)), {
        report_id: id, reporter_id: uid, order_id: order_id == null ? null : normalizeId(order_id),
        category: category || 'OTHER', description: description.trim(), status: 'OPEN',
        created_at: admin.firestore.Timestamp.now(),
      });
    });
    return res.status(201).json({ report: docData(await reports.doc(String(id)).get(), COLLECTIONS.reports) });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to submit report' });
  }
}

async function getMyReports(req, res) {
  try {
    const snapshot = await reports.where('reporter_id', '==', req.user.uid).get();
    const rows = snapshot.docs.map((doc) => docData(doc, COLLECTIONS.reports)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ reports: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

module.exports = { createReport, getMyReports, CATEGORIES };
