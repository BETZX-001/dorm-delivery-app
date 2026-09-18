const { db, COLLECTIONS, allDocs } = require('../db');

async function main() {
  const [users, slots, orders, reviews, reports] = await Promise.all([
    allDocs(COLLECTIONS.users), allDocs(COLLECTIONS.slots), allDocs(COLLECTIONS.orders),
    allDocs(COLLECTIONS.reviews), allDocs(COLLECTIONS.reports),
  ]);
  const ids = {
    users: new Set(users.map((row) => String(row.user_id))),
    slots: new Set(slots.map((row) => String(row.slot_id))),
    orders: new Set(orders.map((row) => String(row.order_id))),
  };
  const problems = [];
  slots.forEach((slot) => { if (!ids.users.has(String(slot.runner_id))) problems.push(`slot ${slot.slot_id}: runner missing`); });
  orders.forEach((order) => {
    if (!ids.slots.has(String(order.slot_id))) problems.push(`order ${order.order_id}: slot missing`);
    if (!ids.users.has(String(order.requester_id))) problems.push(`order ${order.order_id}: requester missing`);
  });
  reviews.forEach((review) => {
    if (!ids.orders.has(String(review.order_id))) problems.push(`review ${review.review_id}: order missing`);
    if (!ids.users.has(String(review.reviewer_id))) problems.push(`review ${review.review_id}: reviewer missing`);
    if (!ids.users.has(String(review.runner_id))) problems.push(`review ${review.review_id}: runner missing`);
  });
  reports.forEach((report) => {
    if (!ids.users.has(String(report.reporter_id))) problems.push(`report ${report.report_id}: reporter missing`);
    if (report.order_id != null && !ids.orders.has(String(report.order_id))) problems.push(`report ${report.report_id}: order missing`);
  });
  const counts = { users: users.length, slots: slots.length, orders: orders.length, reviews: reviews.length, reports: reports.length };
  console.log(JSON.stringify({ database: 'cloud-firestore', counts, relationshipErrors: problems }, null, 2));
  if (problems.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
