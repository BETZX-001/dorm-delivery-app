const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function credentialFromEnvironment() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) return null;
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) return null;
  try {
    return admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
  } catch (error) {
    console.warn('FIREBASE_PRIVATE_KEY is invalid; trying a local service-account file.');
    return null;
  }
}

function credentialFromLocalFile() {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = configured
    ? [path.resolve(configured)]
    : fs.readdirSync(__dirname)
      .filter((name) => /firebase-adminsdk.*\.json$/i.test(name))
      .map((name) => path.join(__dirname, name));
  if (!candidates.length) return null;
  return admin.credential.cert(JSON.parse(fs.readFileSync(candidates[0], 'utf8')));
}

if (!admin.apps.length) {
  // Local development uses the git-ignored service-account JSON when present;
  // deployments fall back to environment credentials or ADC.
  const credential = credentialFromLocalFile() || credentialFromEnvironment() || admin.credential.applicationDefault();
  admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID });
}

module.exports = admin;
