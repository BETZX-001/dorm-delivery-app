/* One-time migration. Runtime code never imports MySQL. */
require('dotenv').config();
const mysql = require('mysql2/promise');
const admin = require('../firebase');
const { db, COLLECTIONS } = require('../db');

const tableConfig = [
  { table: 'Users', collection: COLLECTIONS.users, id: 'user_id' },
  { table: 'Slots', collection: COLLECTIONS.slots, id: 'slot_id' },
  { table: 'Orders', collection: COLLECTIONS.orders, id: 'order_id' },
  { table: 'Reviews', collection: COLLECTIONS.reviews, id: 'review_id' },
  { table: 'Reports', collection: COLLECTIONS.reports, id: 'report_id' },
];
const numericFields = new Set(['slot_id','order_id','review_id','report_id','max_orders','current_orders','quantity','rating_score','fee','avg_rating']);

function firestoreValue(key, value) {
  if (value == null) return null;
  if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
  if (numericFields.has(key)) return Number(value);
  return value;
}

async function commitRows(collection, idField, rows) {
  let batch = db.batch();
  let size = 0;
  for (const row of rows) {
    const payload = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, firestoreValue(key, value)]));
    if (payload.profile_image && Buffer.byteLength(payload.profile_image, 'utf8') > 750_000) {
      throw new Error(`Profile image for user ${payload.user_id} exceeds Firestore document limits`);
    }
    batch.set(db.collection(collection).doc(String(row[idField])), payload, { merge: true });
    size += 1;
    if (size === 450) { await batch.commit(); batch = db.batch(); size = 0; }
  }
  if (size) await batch.commit();
}

async function main() {
  const source = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dorm_delivery',
  });
  const counters = {};
  try {
    for (const config of tableConfig) {
      const [rows] = await source.query(`SELECT * FROM \`${config.table}\``);
      await commitRows(config.collection, config.id, rows);
      const numericIds = rows.map((row) => Number(row[config.id])).filter(Number.isFinite);
      if (config.id !== 'user_id') counters[config.collection] = numericIds.length ? Math.max(...numericIds) : 0;
      console.log(`✓ ${config.table} -> ${config.collection}: ${rows.length} records`);
    }
    await db.collection(COLLECTIONS.meta).doc('counters').set(counters, { merge: true });
    console.log('✓ Counters:', counters);
    console.log('Migration completed. MySQL was read-only and was not deleted.');
  } finally {
    await source.end();
  }
}

main().catch((error) => { console.error('Migration failed:', error); process.exitCode = 1; });
