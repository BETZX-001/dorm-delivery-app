const admin = require('firebase-admin');

// ⚠️ ตรงชื่อไฟล์ในวงเล็บ ให้เปลี่ยนเป็นชื่อไฟล์ JSON จริงที่คุณดาวน์โหลดมา
const serviceAccount = require('./dorm-delivery-app-firebase-adminsdk-fbsvc-972a2b99c7.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;
