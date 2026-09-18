const { admin, db, COLLECTIONS, allDocs, docsByIds, docData } = require('../db');

const ACTIVE_ORDERS = new Set(['PENDING', 'ACCEPTED', 'SHOPPING', 'WAITING', 'DELIVERING']);
const REPORT_ORDER = { OPEN: 0, REVIEWING: 1, RESOLVED: 2 };
const OVERVIEW_CACHE_MS = 15_000;
let overviewCache = null;
let overviewCacheExpiresAt = 0;

async function buildOverview() {
  const [users, slots, orders, reviews, reports] = await Promise.all([
    allDocs(COLLECTIONS.users), allDocs(COLLECTIONS.slots), allDocs(COLLECTIONS.orders),
    allDocs(COLLECTIONS.reviews), allDocs(COLLECTIONS.reports),
  ]);
  const today = new Date();
  const sameLocalDay = (value) => {
    const date = new Date(value);
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  };
  const countStatus = (rows, field, status) => rows.filter((row) => row[field] === status).length;
  const statusCounts = new Map();
  orders.forEach((order) => statusCounts.set(order.order_status, (statusCounts.get(order.order_status) || 0) + 1));
  const reporterMap = await docsByIds(COLLECTIONS.users, reports.map((report) => report.reporter_id));
  const reportRows = reports.map((report) => ({ ...report, reporter_name: reporterMap.get(String(report.reporter_id))?.name }))
    .sort((a, b) => (REPORT_ORDER[a.status] ?? 9) - (REPORT_ORDER[b.status] ?? 9) || new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 30);
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating_score || 0), 0) / reviews.length : 0;
  return {
    stats: {
      total_users: users.length,
      total_slots: slots.filter((slot) => !slot.deleted_at).length,
      open_slots: countStatus(slots, 'status', 'OPEN'), full_slots: countStatus(slots, 'status', 'FULL'),
      shopping_slots: countStatus(slots, 'status', 'SHOPPING'), completed_slots: countStatus(slots, 'status', 'COMPLETED'),
      total_orders: orders.length, active_orders: orders.filter((order) => ACTIVE_ORDERS.has(order.order_status)).length,
      completed_orders: countStatus(orders, 'order_status', 'COMPLETED'),
      completed_today: orders.filter((order) => order.order_status === 'COMPLETED' && sameLocalDay(order.updated_at || order.created_at)).length,
      open_reports: countStatus(reports, 'status', 'OPEN'), reviewing_reports: countStatus(reports, 'status', 'REVIEWING'),
      resolved_reports: countStatus(reports, 'status', 'RESOLVED'), total_reports: reports.length,
      total_reviews: reviews.length, average_rating: Number(averageRating.toFixed(1)),
    },
    order_statuses: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    reports: reportRows,
  };
}

async function getOverview(req, res) {
  try {
    if (!overviewCache || Date.now() >= overviewCacheExpiresAt || req.query.refresh === '1') {
      overviewCache = await buildOverview();
      overviewCacheExpiresAt = Date.now() + OVERVIEW_CACHE_MS;
    }
    return res.json(overviewCache);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load admin overview' });
  }
}

async function updateReportStatus(req, res) {
  const { status } = req.body;
  if (!['OPEN', 'REVIEWING', 'RESOLVED'].includes(status)) return res.status(400).json({ error: 'Invalid report status' });
  try {
    const ref = db.collection(COLLECTIONS.reports).doc(String(req.params.reportId));
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'Report not found' });
    await ref.update({ status, updated_at: admin.firestore.Timestamp.now() });
    overviewCacheExpiresAt = 0;
    const report = docData(await ref.get(), COLLECTIONS.reports);
    const reporter = await db.collection(COLLECTIONS.users).doc(report.reporter_id).get();
    return res.json({ report: { ...report, reporter_name: reporter.data()?.name } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update report status' });
  }
}

module.exports = { getOverview, updateReportStatus };
