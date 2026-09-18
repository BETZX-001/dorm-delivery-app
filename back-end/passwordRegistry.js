const crypto = require('crypto');
const { admin, db } = require('./db');

const registry = db.collection('_password_fingerprints');

function fingerprint(password) {
  const pepper = process.env.PASSWORD_FINGERPRINT_SECRET || `${process.env.FIREBASE_PROJECT_ID}:dorm-delivery-password-v1`;
  return crypto.createHmac('sha256', pepper).update(String(password), 'utf8').digest('hex');
}

async function claimPassword(email, password) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const ref = registry.doc(fingerprint(password));
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists && snapshot.data().email !== normalizedEmail) return { duplicate: true, claimedNew: false };
    const claimedNew = !snapshot.exists;
    transaction.set(ref, { email: normalizedEmail, updated_at: admin.firestore.Timestamp.now() }, { merge: true });
    return { duplicate: false, claimedNew };
  });
}

async function isPasswordClaimed(password) {
  return (await registry.doc(fingerprint(password)).get()).exists;
}

async function releasePassword(email, password) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const ref = registry.doc(fingerprint(password));
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists && snapshot.data().email === normalizedEmail) transaction.delete(ref);
  });
}

module.exports = { claimPassword, releasePassword, isPasswordClaimed, fingerprint, registry };
