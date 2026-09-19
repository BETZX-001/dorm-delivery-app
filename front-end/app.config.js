// app.config.js
require('dotenv').config();

export default {
  expo: {
    name: 'Hiu',
    slug: 'dorm-delivery',
    // Used by the browser-based Google OAuth flow.  This value is public
    // (OAuth client IDs are not secrets), so it is safe to keep in app config.
    scheme: 'hiu',
    version: '1.0.0',
    icon: './assets/hiu-app-icon.png',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    plugins: ['expo-notifications'],

    // เพิ่มการตั้งค่าแพ็กเกจ Android ตรงนี้ครับ
    android: {
      package: 'com.hiu.dormdelivery',
      adaptiveIcon: {
        foregroundImage: './assets/hiu-adaptive-foreground.png',
        backgroundColor: '#FF642E',
      },
    },

    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      apiBaseUrl: process.env.API_BASE_URL || "http://10.68.130.155:4003",
      googleWebClientId:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        '347602612571-vfn1e77tdvjmtgsv07lheja5o8lfj85v.apps.googleusercontent.com',
      // Android must use an OAuth client registered for this app's package
      // name and signing SHA-1. Add it to .env after it is created in Google
      // Cloud/Firebase; never use a client secret in a mobile app.
      googleAndroidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        '347602612571-umpku7iuh3oeerdahopb2o7m69ikut5n.apps.googleusercontent.com',
      eas: {
        projectId: "a871d049-5c49-43af-b8bc-ecab96a2336a"
      }
    },
  },
};
