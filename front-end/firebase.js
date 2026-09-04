// front-end/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};

// ป้องกันการ initialize ซ้ำซ้อน
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ใช้ initializeAuth พร้อม persistence สำหรับ React Native
// ป้องกัน error "Component auth has not been registered yet"
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // กรณี hot reload แล้ว auth ถูก initialize ไปแล้ว
  // ให้ fallback ไปใช้ instance เดิมแทนที่จะ error
  auth = getAuth(app);
}

export { app, auth };