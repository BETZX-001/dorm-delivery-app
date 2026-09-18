# Hiu — Dorm Delivery

ระบบฝากซื้อและรับหิ้วภายในหอพัก ประกอบด้วย Frontend ที่พัฒนาด้วย Expo/React Native, Backend แบบ Express API และฐานข้อมูล Cloud Firestore

คู่มือนี้เขียนสำหรับผู้ทดสอบที่เพิ่งดาวน์โหลดโปรเจกต์จาก GitHub และต้องการเปิดระบบบน Windows ตั้งแต่เริ่มต้น

## ความสามารถหลัก

- สมัครสมาชิกด้วยอีเมล PSU และยืนยันอีเมลก่อนสร้างโปรไฟล์
- ใช้งานในบทบาทผู้ฝากซื้อ (Requester) และผู้รับหิ้ว (Runner)
- สร้างรอบรับหิ้ว ฝากซื้อ ติดตามสถานะ และดูประวัติคำสั่งซื้อ
- แชต ตัวเลขข้อความใหม่ และสถานะอ่านข้อความ
- รีวิวแบบเปิดเผยชื่อหรือไม่ระบุชื่อ
- รายงานปัญหาและ Admin Dashboard ที่อัปเดตอัตโนมัติ
- Push notification และปุ่มโทรโดยไม่แสดงหมายเลขบนหน้าจอ

## 1. สิ่งที่ต้องได้รับจากเจ้าของระบบ

GitHub ไม่มีไฟล์ลับของระบบ ผู้ทดสอบต้องขอไฟล์ต่อไปนี้จากเจ้าของระบบผ่านช่องทางส่วนตัวก่อน:

1. `front-end/.env` ซึ่งมี Firebase Web Configuration
2. `back-end/.env` ซึ่งมีค่าตั้งค่า Backend
3. Firebase Admin service-account JSON ชื่อคล้าย `project-name-firebase-adminsdk-xxxxx.json`

ห้ามส่งไฟล์เหล่านี้ผ่าน GitHub ห้องแชตสาธารณะ หรือ Commit กลับเข้า Repository

หากไม่ได้ใช้ Firebase project เดียวกับเจ้าของระบบ ผู้ทดสอบต้องสร้าง Firebase project ของตัวเอง เปิด Authentication และ Cloud Firestore แล้วนำค่าของ project นั้นมาใช้แทน

## 2. ติดตั้งโปรแกรมที่จำเป็น

ติดตั้งโปรแกรมต่อไปนี้:

- [Node.js 20 LTS หรือใหม่กว่า](https://nodejs.org/)
- [Git for Windows](https://git-scm.com/download/win)
- [Visual Studio Code](https://code.visualstudio.com/) (แนะนำ แต่ไม่บังคับ)
- Google Chrome, Microsoft Edge หรือเบราว์เซอร์สมัยใหม่

เปิด PowerShell หรือ Terminal แล้วตรวจสอบ:

```powershell
node --version
npm --version
git --version
```

ควรเห็น Node.js เวอร์ชัน `20` หรือใหม่กว่า หากคำสั่งใดไม่พบ ให้ปิดและเปิด Terminal ใหม่ก่อนลองอีกครั้ง

## 3. ดาวน์โหลดโปรเจกต์จาก GitHub

ตัวอย่างนี้เก็บโปรเจกต์ไว้บน Desktop:

```powershell
cd $HOME\Desktop
git clone https://github.com/BETZX-001/dorm-delivery-app.git
cd dorm-delivery-app
Get-ChildItem
```

ควรพบโครงสร้างหลัก:

```text
dorm-delivery-app/
├── back-end/
├── front-end/
└── README.md
```

ถ้าเคย Clone ไว้แล้ว ให้อัปเดตด้วย:

```powershell
cd $HOME\Desktop\dorm-delivery-app
git pull origin main
```

## 4. ตั้งค่า Firebase

หากใช้ Firebase project ใหม่ ให้เข้า [Firebase Console](https://console.firebase.google.com/) และตั้งค่าดังนี้:

1. สร้างหรือเลือก Firebase project
2. เปิด **Authentication > Sign-in method > Email/Password**
3. เปิด Google provider หากต้องการทดสอบ Google Sign-In
4. สร้าง **Cloud Firestore Database**
5. เพิ่ม Web App แล้วคัดลอก Firebase Configuration มาใส่ใน `front-end/.env`
6. ไปที่ **Project settings > Service accounts > Generate new private key** เพื่อดาวน์โหลด Admin JSON

ใช้ Firebase project สำหรับทดสอบแยกจาก Production และตั้ง Firestore Security Rules ให้เหมาะสมก่อนใช้งานจริง

## 5. ตั้งค่าและเปิด Backend

เปิด Terminal หน้าต่างที่ 1 แล้วรัน:

```powershell
cd $HOME\Desktop\dorm-delivery-app\back-end
npm ci
```

ถ้าเจ้าของระบบส่ง `back-end/.env` มาให้ ให้วางไฟล์นั้นในโฟลเดอร์ `back-end` ได้เลย หากยังไม่มีไฟล์ ให้สร้างจากตัวอย่าง:

```powershell
Copy-Item .env.example .env
notepad .env
```

ตัวอย่างค่าใน `back-end/.env`:

```env
PORT=4000
FIREBASE_PROJECT_ID=your-firebase-project-id
ADMIN_EMAILS=admin@psu.ac.th
PASSWORD_FINGERPRINT_SECRET=replace-with-a-long-random-secret

DORM_RUNNER_TEST_PASSWORD=ตั้งรหัสผ่านบัญชีรันเนอร์ทดสอบ
DORM_REQUESTER_TEST_PASSWORD=ตั้งรหัสผ่านบัญชีผู้ฝากซื้อทดสอบ
SMOKE_API_BASE_URL=http://localhost:4000
```

`PASSWORD_FINGERPRINT_SECRET` ควรเป็นข้อความสุ่มที่ยาวและคาดเดายาก ห้ามใช้ค่าตัวอย่างในระบบจริง

นำ Firebase Admin JSON ไปวางใน `dorm-delivery-app/back-end/` ชื่อไฟล์ต้องมีคำว่า `firebase-adminsdk` ตัวอย่าง:

```text
dorm-delivery-app-firebase-adminsdk-abcde12345.json
```

จากนั้นเปิด Backend:

```powershell
npm run dev
```

อย่าปิด Terminal หน้าต่างนี้ Backend ต้องเปิดค้างไว้ระหว่างทดสอบ

### ตรวจสอบ Backend

เปิด URL นี้ในเบราว์เซอร์:

```text
http://localhost:4000/health
```

ถ้าทำงานถูกต้อง จะได้รับ JSON ที่แสดงสถานะของ API และการเชื่อมต่อ Firestore

## 6. ตั้งค่า Frontend

เปิด Terminal หน้าต่างที่ 2 โดยไม่ต้องปิด Backend แล้วรัน:

```powershell
cd $HOME\Desktop\dorm-delivery-app\front-end
npm ci
```

ถ้าเจ้าของระบบส่ง `front-end/.env` มาให้ ให้วางไว้ในโฟลเดอร์ `front-end` หากต้องสร้างเอง:

```powershell
Copy-Item .env.example .env
notepad .env
```

กรอก Firebase Web Configuration:

```env
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_STORAGE_BUCKET=your-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=

API_BASE_URL=http://localhost:4000
```

ค่า `FIREBASE_PROJECT_ID` ต้องเป็น project เดียวกับ Backend หากยังไม่ทดสอบ Google Sign-In สามารถเว้น Google Client ID ไว้ก่อนได้

## 7. เปิดเว็บไซต์

ใน Terminal ของ `front-end` รัน:

```powershell
npm run web
```

รอจน Expo Compile เสร็จ ระบบจะเปิดเบราว์เซอร์ให้อัตโนมัติ ถ้าไม่เปิด ให้ดู URL ที่แสดงใน Terminal โดยทั่วไปคือ:

```text
http://localhost:8081
```

ระหว่างใช้งานต้องมี Terminal เปิดอยู่สองหน้าต่าง:

```text
Terminal 1 — Backend  : http://localhost:4000
Terminal 2 — Frontend : http://localhost:8081
```

หาก Port `8081` ถูกใช้งาน Expo อาจถามว่าจะใช้ Port อื่นหรือไม่ ให้กด `Y` และเปิด URL ใหม่ที่แสดงใน Terminal

## 8. สร้างบัญชีทดสอบ (ถ้าต้องการ)

กำหนด `DORM_RUNNER_TEST_PASSWORD` และ `DORM_REQUESTER_TEST_PASSWORD` ใน `back-end/.env` ก่อน จากนั้นเปิด Terminal อีกหน้าต่างแล้วรัน:

```powershell
cd $HOME\Desktop\dorm-delivery-app\back-end
npm run seed:test-users
```

ระบบจะสร้างหรือรีเซ็ตบัญชี:

```text
runner-test@psu.ac.th
requester-test@psu.ac.th
```

รหัสผ่านคือค่าที่ผู้ทดสอบตั้งไว้ใน `.env` และรหัสผ่านของสองบัญชีต้องไม่ซ้ำกัน

## 9. เปิดระบบในครั้งถัดไป

ไม่ต้องรัน `npm ci` ซ้ำทุกครั้ง เปิดเพียงสอง Terminal

Terminal ที่ 1:

```powershell
cd $HOME\Desktop\dorm-delivery-app\back-end
npm run dev
```

Terminal ที่ 2:

```powershell
cd $HOME\Desktop\dorm-delivery-app\front-end
npm run web
```

## 10. อัปเดตโค้ดเป็นเวอร์ชันล่าสุด

หยุด Backend และ Frontend ด้วย `Ctrl+C` ก่อน แล้วรัน:

```powershell
cd $HOME\Desktop\dorm-delivery-app
git pull origin main
cd back-end
npm ci
cd ..\front-end
npm ci
```

จากนั้นเปิด Backend และ Frontend ใหม่

## 11. ทดสอบระบบอัตโนมัติ

ต้องเปิด Backend อยู่ก่อน แล้วจึงรันจากโฟลเดอร์ `back-end`:

```powershell
cd $HOME\Desktop\dorm-delivery-app\back-end
npm run test:firebase
npm run test:firebase:writes
npm run test:e2e
npm run test:email-verification
npm run verify:firestore
```

คำสั่งทดสอบบางรายการเขียนข้อมูลลง Firebase จึงควรใช้ฐานข้อมูลสำหรับทดสอบเท่านั้น

ทดสอบการ Export Frontend:

```powershell
cd $HOME\Desktop\dorm-delivery-app\front-end
npx expo export --platform web
npx expo export --platform android
npx expo export --platform ios
```

## 12. เปิดจากโทรศัพท์จริง

โทรศัพท์และคอมพิวเตอร์ต้องเชื่อมต่อ Wi-Fi วงเดียวกัน หา IPv4 ของคอมพิวเตอร์ด้วย:

```powershell
ipconfig
```

แก้ `API_BASE_URL` ใน `front-end/.env` จาก `localhost` เป็น IPv4 ของคอมพิวเตอร์ ตัวอย่าง:

```env
API_BASE_URL=http://192.168.1.50:4000
```

อนุญาต Node.js ผ่าน Windows Firewall หากมีหน้าต่างถาม และรีสตาร์ต Expo หลังแก้ `.env`

## 13. วิธีแก้ปัญหาที่พบบ่อย

### `npm` หรือ `node` ไม่พบ

ติดตั้ง Node.js 20 LTS แล้วปิดและเปิด Terminal ใหม่ ตรวจด้วย `node --version`

### `git` ไม่พบ

ติดตั้ง Git for Windows แล้วเปิด Terminal ใหม่

### เปิดเว็บได้ แต่ไม่มีข้อมูลหรือขึ้น Network Error

1. ตรวจว่า Backend Terminal ยังเปิดอยู่
2. เปิด `http://localhost:4000/health`
3. ตรวจว่า `API_BASE_URL=http://localhost:4000`
4. ตรวจว่า Frontend และ Backend ใช้ `FIREBASE_PROJECT_ID` เดียวกัน
5. รีสตาร์ต Backend และ Frontend หลังแก้ `.env`

### Backend หา Firebase credentials ไม่พบ

ตรวจว่า Admin JSON อยู่ใน `back-end` และชื่อไฟล์มีคำว่า `firebase-adminsdk` ห้ามเปลี่ยนนามสกุลเป็น `.txt`

### แก้ `.env` แล้วค่าใหม่ไม่ทำงาน

หยุด Expo ด้วย `Ctrl+C` แล้วเปิดใหม่พร้อมล้าง Cache:

```powershell
npx expo start --web --clear
```

### Port 4000 ถูกใช้งาน

หา Process ที่ใช้ Port:

```powershell
netstat -ano | findstr :4000
```

เปลี่ยน `PORT` ใน `back-end/.env` และ `API_BASE_URL` ใน `front-end/.env` ให้เป็น Port เดียวกัน

### ติดตั้งแพ็กเกจไม่สำเร็จ

ตรวจอินเทอร์เน็ตและ Node.js ก่อน แล้วลอง:

```powershell
npm cache verify
npm ci
```

## ข้อควรระวัง

- ห้าม Commit `.env`, Firebase Admin JSON, รหัสผ่าน หรือข้อมูลส่วนตัวของผู้ใช้
- ใช้ Firebase project สำหรับทดสอบแยกจาก Production
- Push notification, Google PSU Sign-In และการโทรควรทดสอบบนโทรศัพท์จริง
- ระบบอยู่ในช่วง Beta/UAT ควรใช้ข้อมูลจำลองระหว่างทดสอบ

## Deploy Backend บน Render

Repository มี `render.yaml` สำหรับสร้าง Backend ออนไลน์โดยไม่ต้องเปิด `npm run dev` บนคอมพิวเตอร์:

1. สมัครหรือเข้าสู่ระบบ [Render](https://render.com/) ด้วย GitHub
2. เลือก **New > Blueprint** แล้วเลือก Repository `BETZX-001/dorm-delivery-app`
3. Render จะอ่าน `render.yaml` และสร้าง Web Service ชื่อ `hiu-dorm-delivery-api`
4. ใส่ Environment Variables ที่ถูกกำหนดเป็น `sync: false` ให้ครบ
5. กด Deploy และรอจน `/health` แสดงสถานะ `ok`

ค่าที่ต้องนำมาจาก Firebase Admin service-account JSON:

```text
FIREBASE_PROJECT_ID     = ค่า project_id
FIREBASE_CLIENT_EMAIL   = ค่า client_email
FIREBASE_PRIVATE_KEY    = ค่า private_key ทั้งก้อน รวม BEGIN/END PRIVATE KEY
ADMIN_EMAILS            = อีเมลแอดมิน คั่นหลายบัญชีด้วยเครื่องหมายจุลภาค
```

ห้ามนำค่าเหล่านี้ใส่ใน GitHub หลัง Deploy สำเร็จ Render จะให้ URL ลักษณะนี้:

```text
https://hiu-dorm-delivery-api.onrender.com
```

นำ URL จริงไปใส่ใน `front-end/.env` ก่อน Build APK:

```env
API_BASE_URL=https://ชื่อ-serviceจริง.onrender.com
```

## โครงสร้างโปรเจกต์

```text
back-end/   Express API, Firebase Admin, Firestore และชุดทดสอบ
front-end/  Expo/React Native application สำหรับ Web, Android และ iOS
```
