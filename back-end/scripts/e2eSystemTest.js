const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'front-end', '.env') });
const { db, COLLECTIONS } = require('../db');

const baseUrl = process.env.SMOKE_API_BASE_URL || 'http://localhost:4000';
const apiKey = process.env.FIREBASE_API_KEY;
const accounts = {
  runner: ['runner-test@psu.ac.th', process.env.DORM_RUNNER_TEST_PASSWORD],
  requester: ['requester-test@psu.ac.th', process.env.DORM_REQUESTER_TEST_PASSWORD],
};
const created = { slot: null, order: null, review: null, report: null, messages: [] };
const results = [];

function record(name, ok, detail = '') { results.push({ name, ok, detail }); if (!ok) throw new Error(`${name}: ${detail}`); }
async function signIn([email, password]) {
  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  record(`Login ${email}`, response.ok, `HTTP ${response.status}`);
  const body = await response.json(); return { token: body.idToken, uid: body.localId };
}
async function call(token, route, method = 'GET', body, expected = 200) {
  const response = await fetch(`${baseUrl}${route}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  const allowed = Array.isArray(expected) ? expected : [expected];
  record(`${method} ${route}`, allowed.includes(response.status), `expected ${allowed.join('/')} got ${response.status}: ${data.error || ''}`);
  return data;
}

async function cleanup(runnerUid, originalRating) {
  const batch = db.batch();
  if (created.slot != null) {
    const leakedOrders = await db.collection(COLLECTIONS.orders).where('slot_id', '==', created.slot).get();
    leakedOrders.docs
      .filter((doc) => doc.data().note === 'temporary automated test' && doc.id !== String(created.order))
      .forEach((doc) => batch.delete(doc.ref));
  }
  if (created.review != null) batch.delete(db.collection(COLLECTIONS.reviews).doc(String(created.review)));
  if (created.report != null) batch.delete(db.collection(COLLECTIONS.reports).doc(String(created.report)));
  created.messages.forEach((id) => batch.delete(db.collection(COLLECTIONS.messages).doc(String(id))));
  if (created.order != null) batch.delete(db.collection(COLLECTIONS.orders).doc(String(created.order)));
  if (created.slot != null) batch.delete(db.collection(COLLECTIONS.slots).doc(String(created.slot)));
  if (runnerUid) batch.update(db.collection(COLLECTIONS.users).doc(runnerUid), { avg_rating: originalRating });
  await batch.commit();
}

async function main() {
  if (!accounts.runner[1] || !accounts.requester[1]) {
    throw new Error('Set DORM_RUNNER_TEST_PASSWORD and DORM_REQUESTER_TEST_PASSWORD in .env before running E2E tests');
  }
  const health = await call(null, '/health'); record('Firestore health', health.db === 'connected', JSON.stringify(health));
  await call(null, '/api/users/me', 'GET', undefined, 401);
  const [runner, requester] = await Promise.all([signIn(accounts.runner), signIn(accounts.requester)]);
  const runnerMe = await call(runner.token, '/api/users/me');
  const requesterMe = await call(requester.token, '/api/users/me');
  record('Gender persisted for runner', ['MALE', 'FEMALE', 'LGBTQ_PLUS', 'UNSPECIFIED'].includes(runnerMe.user.gender), runnerMe.user.gender);
  record('Gender persisted for requester', ['MALE', 'FEMALE', 'LGBTQ_PLUS', 'UNSPECIFIED'].includes(requesterMe.user.gender), requesterMe.user.gender);
  const originalRating = Number(runnerMe.user.avg_rating || 0);
  try {
    const start = new Date(Date.now() + 30 * 60_000); const cutOff = new Date(Date.now() + 90 * 60_000);
    const slot = await call(runner.token, '/api/slots', 'POST', { destination: 'E2E automated test', start_time: start.toISOString(), cut_off_time: cutOff.toISOString(), max_orders: 2, fee: 5 }, 201);
    created.slot = slot.slot.slot_id;
    await call(runner.token, '/api/orders', 'POST', { slot_id: created.slot, item_name: 'Forbidden own item', quantity: 1 }, 400);
    const order = await call(requester.token, '/api/orders', 'POST', { slot_id: created.slot, item_name: 'E2E item', quantity: 2, note: 'temporary automated test' }, 201);
    created.order = order.order.order_id;
    await call(requester.token, `/api/orders/${created.order}/status`, 'PATCH', { order_status: 'ACCEPTED' }, 403);
    await call(runner.token, `/api/orders/${created.order}/status`, 'PATCH', { order_status: 'COMPLETED' }, 409);
    const sent = await call(requester.token, `/api/chats/${created.order}`, 'POST', { text: 'ทดสอบข้อความใหม่' }, 201); created.messages.push(sent.message.message_id);
    const unread = await call(runner.token, '/api/chats/unread'); record('Unread badge increments', unread.total >= 1, `total=${unread.total}`);
    const messages = await call(runner.token, `/api/chats/${created.order}`); record('Read receipt set', messages.messages.some((m) => m.message_id === sent.message.message_id && m.read_at), 'read_at missing');
    for (const status of ['ACCEPTED', 'SHOPPING', 'WAITING', 'DELIVERING', 'COMPLETED']) await call(runner.token, `/api/orders/${created.order}/status`, 'PATCH', { order_status: status });
    const completed = await call(requester.token, `/api/orders/${created.order}`); record('Phone hidden after completion', completed.order.runner_phone == null && completed.order.requester_phone == null, 'phone leaked');
    await call(requester.token, `/api/chats/${created.order}`, 'POST', { text: 'must be blocked' }, 409);
    const review = await call(requester.token, '/api/reviews', 'POST', { order_id: created.order, rating_score: 5, comment: 'E2E review', is_anonymous: true }, 201); created.review = review.review.review_id;
    await call(requester.token, '/api/reviews', 'POST', { order_id: created.order, rating_score: 5 }, 409);
    await call(requester.token, `/api/reviews/${created.review}/privacy`, 'PATCH', { is_anonymous: false });
    await call(runner.token, `/api/reviews/${created.review}/privacy`, 'PATCH', { is_anonymous: true }, 403);
    const report = await call(requester.token, '/api/reports', 'POST', { order_id: created.order, category: 'OTHER', description: 'E2E report - delete after test' }, 201); created.report = report.report.report_id;
    const profile = await call(requester.token, `/api/users/${runner.uid}/public`); record('Public profile stats returned', typeof profile.stats?.runner_completed === 'number', 'missing stats');
  } finally { await cleanup(runner.uid, originalRating); }
  console.log(JSON.stringify({ passed: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length, results }, null, 2));
}

main().catch((error) => { console.error(JSON.stringify({ error: error.message, results }, null, 2)); process.exitCode = 1; });
