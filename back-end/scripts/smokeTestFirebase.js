const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'front-end', '.env') });

const apiKey = process.env.FIREBASE_API_KEY;
const testPasswords = {
  'runner-test@psu.ac.th': process.env.DORM_RUNNER_TEST_PASSWORD,
  'requester-test@psu.ac.th': process.env.DORM_REQUESTER_TEST_PASSWORD,
};
const baseUrl = process.env.SMOKE_API_BASE_URL || 'http://localhost:4000';

async function signIn(email) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: testPasswords[email], returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Login failed for ${email}: ${response.status}`);
  return (await response.json()).idToken;
}

async function get(token, route) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${route}: ${response.status} ${body.error || ''}`);
  return body;
}

async function checkAccount(email, routes) {
  const token = await signIn(email);
  const result = {};
  for (const [name, route, key] of routes) {
    const body = await get(token, route);
    result[name] = key ? body[key]?.length ?? 0 : body.user?.role;
  }
  return result;
}

async function main() {
  if (!apiKey) throw new Error('FIREBASE_API_KEY is missing from front-end/.env');
  if (Object.values(testPasswords).some((password) => !password)) {
    throw new Error('Set DORM_RUNNER_TEST_PASSWORD and DORM_REQUESTER_TEST_PASSWORD in .env before running smoke tests');
  }
  const requester = await checkAccount('requester-test@psu.ac.th', [
    ['role', '/api/users/me'], ['availableSlots', '/api/slots/available', 'slots'],
    ['orders', '/api/orders/mine', 'orders'], ['reviews', '/api/reviews/mine', 'reviews'],
    ['reports', '/api/reports/mine', 'reports'],
  ]);
  const runner = await checkAccount('runner-test@psu.ac.th', [
    ['role', '/api/users/me'], ['slots', '/api/slots/mine', 'slots'],
    ['orders', '/api/orders/runner/mine', 'orders'], ['reviews', '/api/reviews/mine', 'reviews'],
  ]);
  console.log(JSON.stringify({ api: baseUrl, requester, runner }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
