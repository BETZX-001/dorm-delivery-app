// src/api/client.js
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;
// Web and API normally run on the same computer. Deriving the host prevents
// the app from hanging whenever DHCP gives the development machine a new IP.
const BASE_URL = configuredBaseUrl || (
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : undefined
);
const READ_TIMEOUT_MS = 15_000;
const MUTATION_TIMEOUT_MS = 35_000;
const responseCache = new Map();

function cacheKey(path) {
  return `api-cache:${auth.currentUser?.uid || 'guest'}:${path}`;
}

async function saveCache(path, data) {
  const entry = { data, savedAt: Date.now() };
  responseCache.set(cacheKey(path), entry);
  try { await AsyncStorage.setItem(cacheKey(path), JSON.stringify(entry)); } catch { /* memory cache still works */ }
}

async function readCache(path) {
  const key = cacheKey(path);
  if (responseCache.has(key)) return responseCache.get(key);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    responseCache.set(key, entry);
    return entry;
  } catch { return null; }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('เซิร์ฟเวอร์ตอบสนองช้าชั่วคราว กรุณาลองใหม่อีกครั้ง');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function request(path, { method = 'GET', body, auth: needsAuth = true } = {}) {
  const send = async (forceRefresh = false) => {
    const headers = { 'Content-Type': 'application/json' };

    if (needsAuth) {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('กรุณาเข้าสู่ระบบอีกครั้ง');
      }
      const idToken = await currentUser.getIdToken(forceRefresh);
      headers.Authorization = `Bearer ${idToken}`;
    }

    const response = await fetchWithTimeout(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }, method === 'GET' ? READ_TIMEOUT_MS : MUTATION_TIMEOUT_MS);
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  let { response, data } = await send(false);

  // A browser tab can stay open longer than a Firebase ID token's lifetime.
  // Refresh once and replay the request after the API rejects the stale token.
  if (needsAuth && response.status === 401) {
    try {
      ({ response, data } = await send(true));
    } catch (error) {
      throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
    }
  }

  if (!response.ok) {
    const message = response.status === 401
      ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'
      : data.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  getCached: async (path) => {
    const cached = await readCache(path);
    if (cached) {
      request(path, { method: 'GET' }).then((data) => saveCache(path, data)).catch(() => {});
      return cached.data;
    }
    const data = await request(path, { method: 'GET' });
    await saveCache(path, data);
    return data;
  },
  post: (path, body) => request(path, { method: 'POST', body }),
  postPublic: (path, body) => request(path, { method: 'POST', body, auth: false }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
