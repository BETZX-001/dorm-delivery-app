// app.config.js
require('dotenv').config();

export default {
  expo: {
    name: 'Dorm Delivery',
    slug: 'dorm-delivery',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      apiBaseUrl: process.env.API_BASE_URL || "http://10.68.130.155:4000",
    },
  },
};
