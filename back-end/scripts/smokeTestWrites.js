const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'front-end', '.env') });
const { db, COLLECTIONS } = require('../db');

const apiKey = process.env.FIREBASE_API_KEY;
const testPasswords = {
  'runner-test@psu.ac.th': process.env.DORM_RUNNER_TEST_PASSWORD,
  'requester-test@psu.ac.th': process.env.DORM_REQUESTER_TEST_PASSWORD,
};
const baseUrl = process.env.SMOKE_API_BASE_URL || 'http://localhost:4000';

async function signIn(email) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: testPasswords[email], returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Login failed: ${email}`);
  return (await response.json()).idToken;
}

async function request(token, route, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status} ${data.error || ''}`);
  return data;
}

async function main() {
  if (Object.values(testPasswords).some((password) => !password)) {
    throw new Error('Set DORM_RUNNER_TEST_PASSWORD and DORM_REQUESTER_TEST_PASSWORD in .env before running write tests');
  }
  const [runnerToken, requesterToken] = await Promise.all([
    signIn('runner-test@psu.ac.th'), signIn('requester-test@psu.ac.th'),
  ]);
  let slotId;
  let orderId;
  try {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const cutOff = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const { slot } = await request(runnerToken, '/api/slots', 'POST', {
      destination: 'Firestore smoke test', start_time: start.toISOString(), cut_off_time: cutOff.toISOString(), max_orders: 2, fee: 5,
    });
    slotId = slot.slot_id;
    const { order } = await request(requesterToken, '/api/orders', 'POST', {
      slot_id: slotId, item_name: 'Temporary test item', quantity: 1, note: 'automated smoke test',
    });
    orderId = order.order_id;
    const accepted = await request(runnerToken, `/api/orders/${orderId}/status`, 'PATCH', { order_status: 'ACCEPTED' });
    const tracked = await request(requesterToken, `/api/orders/${orderId}`);
    console.log(JSON.stringify({ createdSlot: slotId, createdOrder: orderId, statusAfterUpdate: accepted.order.order_status, requesterCanTrack: tracked.order.order_id === orderId }, null, 2));
  } finally {
    const batch = db.batch();
    if (orderId != null) batch.delete(db.collection(COLLECTIONS.orders).doc(String(orderId)));
    if (slotId != null) batch.delete(db.collection(COLLECTIONS.slots).doc(String(slotId)));
    if (orderId != null || slotId != null) await batch.commit();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
