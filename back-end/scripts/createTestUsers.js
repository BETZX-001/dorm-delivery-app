const admin = require('../firebase');
const { db, COLLECTIONS } = require('../db');

const testUsers = [
  { email: 'runner-test@psu.ac.th', password: process.env.DORM_RUNNER_TEST_PASSWORD, name: 'รันเนอร์ทดสอบ', phone: '080-000-0001', gender: 'UNSPECIFIED', dorm_name: 'หอ1', room_number: '101', role: 'RUNNER' },
  { email: 'requester-test@psu.ac.th', password: process.env.DORM_REQUESTER_TEST_PASSWORD, name: 'ผู้ฝากหิ้วทดสอบ', phone: '080-000-0002', gender: 'UNSPECIFIED', dorm_name: 'หอ1', room_number: '102', role: 'REQUESTER' },
];

async function getOrCreateFirebaseUser(account) {
  try {
    const existing = await admin.auth().getUserByEmail(account.email);
    return admin.auth().updateUser(existing.uid, { password: account.password, displayName: account.name, emailVerified: true, disabled: false });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    return admin.auth().createUser({ email: account.email, password: account.password, displayName: account.name, emailVerified: true });
  }
}

async function main() {
  if (testUsers.some((account) => !account.password)) {
    throw new Error('Set DORM_RUNNER_TEST_PASSWORD and DORM_REQUESTER_TEST_PASSWORD in .env before creating test users');
  }
  for (const account of testUsers) {
    const firebaseUser = await getOrCreateFirebaseUser(account);
    const ref = db.collection(COLLECTIONS.users).doc(firebaseUser.uid);
    const existing = await ref.get();
    const { password: _password, ...profile } = account;
    await ref.set({
      user_id: firebaseUser.uid, ...profile, avg_rating: Number(existing.data()?.avg_rating || 0),
      created_at: existing.data()?.created_at || admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
    }, { merge: true });
    const { claimPassword } = require('../passwordRegistry');
    await claimPassword(account.email, account.password);
    console.log(`✓ ${account.role}: ${account.email}`);
  }
  console.log('\nสร้างบัญชีทดสอบใน Firebase Authentication และ Cloud Firestore เรียบร้อย');
  console.log('รหัสผ่านบัญชีทดสอบถูกกำหนดแยกกันเรียบร้อย');
}

main().catch((error) => { console.error('สร้างบัญชีทดสอบไม่สำเร็จ:', error.message); process.exitCode = 1; });
