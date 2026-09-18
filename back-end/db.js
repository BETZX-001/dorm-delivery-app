const admin = require('./firebase');

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const COLLECTIONS = Object.freeze({
  users: 'users',
  slots: 'slots',
  orders: 'orders',
  reviews: 'reviews',
  reports: 'reports',
  messages: 'messages',
  meta: '_meta',
});

const ID_FIELDS = Object.freeze({
  users: 'user_id',
  slots: 'slot_id',
  orders: 'order_id',
  reviews: 'review_id',
  reports: 'report_id',
});

function normalizeId(value) {
  if (typeof value === 'number') return value;
  const text = String(value);
  return /^\d+$/.test(text) ? Number(text) : text;
}

function asTimestamp(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(date);
}

function jsonValue(value) {
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, jsonValue(child)]));
  }
  return value;
}

function docData(snapshot, collectionName) {
  if (!snapshot?.exists) return null;
  const data = snapshot.data();
  const idField = ID_FIELDS[collectionName];
  return jsonValue({
    ...data,
    ...(idField && data[idField] == null ? { [idField]: normalizeId(snapshot.id) } : {}),
  });
}

async function allDocs(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => docData(doc, collectionName));
}

async function docsByIds(collectionName, ids) {
  const unique = [...new Set(ids.filter((id) => id !== null && id !== undefined).map(String))];
  if (!unique.length) return new Map();
  const snapshots = await db.getAll(...unique.map((id) => db.collection(collectionName).doc(id)));
  return new Map(snapshots.filter((doc) => doc.exists).map((doc) => [String(doc.id), docData(doc, collectionName)]));
}

async function docsByIdsSelected(collectionName, ids, fields) {
  const unique = [...new Set(ids.filter((id) => id !== null && id !== undefined).map(String))];
  if (!unique.length) return new Map();
  const refs = unique.map((id) => db.collection(collectionName).doc(id));
  const snapshots = await db.getAll(...refs, { fieldMask: fields });
  return new Map(snapshots.filter((doc) => doc.exists).map((doc) => [String(doc.id), docData(doc, collectionName)]));
}

async function nextNumericId(transaction, counterName) {
  const counterRef = db.collection(COLLECTIONS.meta).doc('counters');
  const snapshot = await transaction.get(counterRef);
  const current = Number(snapshot.data()?.[counterName] || 0);
  const next = current + 1;
  transaction.set(counterRef, { [counterName]: next }, { merge: true });
  return next;
}

module.exports = {
  admin,
  db,
  COLLECTIONS,
  normalizeId,
  asTimestamp,
  jsonValue,
  docData,
  allDocs,
  docsByIds,
  docsByIdsSelected,
  nextNumericId,
};
