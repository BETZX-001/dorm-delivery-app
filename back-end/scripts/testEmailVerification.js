const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'front-end', '.env') });
const admin = require('../firebase');
const { db, COLLECTIONS } = require('../db');

const apiKey = process.env.FIREBASE_API_KEY;
const email = `verification-e2e-${Date.now()}@psu.ac.th`;
const password = `Verify${Date.now()}!Aa`;
let uid;

async function main() {
  const created = await admin.auth().createUser({ email, password, emailVerified: false });
  uid = created.uid;
  const before = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (before.exists) throw new Error('พบโปรไฟล์ในฐานข้อมูลก่อนยืนยันอีเมล');

  const link = await admin.auth().generateEmailVerificationLink(email);
  const oobCode = new URL(link).searchParams.get('oobCode');
  if (!oobCode) throw new Error('Firebase verification link ไม่มี oobCode');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`ใช้ verification link ไม่สำเร็จ: ${JSON.stringify(body)}`);
  const verified = await admin.auth().getUser(uid);
  if (!verified.emailVerified) throw new Error('Firebase ยังไม่เปลี่ยนสถานะ emailVerified');
  const after = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (after.exists) throw new Error('ระบบสร้างโปรไฟล์โดยอัตโนมัติก่อนผู้ใช้กลับเข้าแอป');
  console.log(JSON.stringify({ linkGenerated: true, codeApplied: true, emailVerified: true, databaseBeforeVerification: false, databaseAfterVerificationBeforeAppSync: false }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (uid) await admin.auth().deleteUser(uid).catch(() => {});
});
