# Hiu — Dorm Delivery

ระบบฝากซื้อและรับหิ้วภายในหอพัก ประกอบด้วย Expo/React Native frontend, Express API และ Cloud Firestore

## ความสามารถหลัก

- สมัครสมาชิกด้วยอีเมล PSU และยืนยันอีเมลก่อนสร้างโปรไฟล์
- สลับบทบาท Requester/Runner
- สร้างรอบรับหิ้ว ฝากซื้อ ติดตามสถานะ และดูประวัติ
- แชต ตัวเลขข้อความใหม่ และสถานะอ่านแล้ว
- รีวิวแบบเปิดเผยชื่อหรือไม่ระบุชื่อ
- รายงานปัญหาและ Admin Dashboard ที่อัปเดตอัตโนมัติ
- Push notification และปุ่มโทรโดยไม่แสดงหมายเลขบนหน้าจอ

## สิ่งที่ต้องติดตั้ง

- Node.js 20 LTS หรือใหม่กว่า
- npm
- Expo Go หรือ Android/iOS simulator สำหรับทดสอบแอป
- Firebase project ที่เปิด Authentication และ Cloud Firestore

## ตั้งค่า Backend

```bash
cd back-end
npm install
copy .env.example .env
npm run dev
```

ดาวน์โหลด Firebase Admin service-account JSON จาก Firebase Console แล้ววางใน `back-end` ไฟล์นี้ถูก `.gitignore` และห้าม commit ขึ้น GitHub

Backend ทำงานเริ่มต้นที่ `http://localhost:4000`

## ตั้งค่า Frontend

```bash
cd front-end
npm install
copy .env.example .env
npm run web
```

กรอกค่า Firebase public config, Google OAuth client IDs และ `API_BASE_URL` ใน `front-end/.env` หากทดสอบจากโทรศัพท์จริง ให้ใช้ IP ของคอมพิวเตอร์ในวง LAN แทน `localhost`

## บัญชีทดสอบ

สร้างหรือรีเซ็ตบัญชีทดสอบด้วย:

```bash
cd back-end
npm run seed:test-users
```

กำหนดรหัสผ่านผ่าน `DORM_RUNNER_TEST_PASSWORD` และ `DORM_REQUESTER_TEST_PASSWORD` ใน `.env` ห้ามใส่รหัสผ่านจริงลงใน Git

## ชุดทดสอบ

ต้องเปิด Backend ก่อน แล้วจึงรัน:

```bash
cd back-end
npm run test:firebase
npm run test:firebase:writes
npm run test:e2e
npm run test:email-verification
npm run verify:firestore
```

ทดสอบ build:

```bash
cd front-end
npx expo export --platform web
npx expo export --platform android
npx expo export --platform ios
```

## ข้อควรระวัง

- ห้าม commit `.env`, Firebase Admin JSON หรือข้อมูลส่วนตัวของผู้ใช้
- ใช้ Firebase project สำหรับทดสอบแยกจาก production
- Push notification, Google PSU Sign-In และการโทรควรทดสอบบนอุปกรณ์จริง
- ระบบนี้อยู่ในช่วง Beta/UAT ไม่ควรใช้ข้อมูลสำคัญใน production จนกว่าจะผ่านการทดสอบภาคสนาม

## โครงสร้าง

```text
back-end/   Express API, Firebase Admin, tests
front-end/  Expo React Native application
```
