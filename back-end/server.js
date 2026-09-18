// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { verifyFirebaseToken } = require('./authMiddleware');

const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
// Profile photos are compressed by the client and sent as data URLs.
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Cheap app-wide change signal. Clients poll this in memory and only read
// Firestore again when a successful mutation actually changed application data.
let systemRevision = Date.now();
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && req.path.startsWith('/api/')) {
    res.once('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) systemRevision = Date.now();
    });
  }
  next();
});

// Bound each slow request independently. A single cold/slow Firestore request
// must not block unrelated API routes for another minute.
const FIRESTORE_READ_TIMEOUT_MS = 10_000;
const FIRESTORE_MUTATION_TIMEOUT_MS = 30_000;
app.use((req, res, next) => {
  if (req.path === '/api/events/revision') return next();
  if (req.path !== '/health' && !req.path.startsWith('/api/')) return next();

  const originalJson = res.json.bind(res);
  res.json = (body) => (res.writableEnded ? res : originalJson(body));
  // Firestore transactions may still commit after the HTTP timer fires. Give
  // writes enough time to finish so clients never receive a false failure and
  // retry a mutation that was already committed.
  const timeoutMs = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)
    ? FIRESTORE_MUTATION_TIMEOUT_MS
    : FIRESTORE_READ_TIMEOUT_MS;
  const timer = setTimeout(() => {
    if (!res.headersSent && !res.writableEnded) {
      res.status(503).json({
        error: 'Firebase ตอบสนองช้าชั่วคราว กรุณาลองใหม่อีกครั้ง',
        code: 'FIRESTORE_TIMEOUT',
      });
    }
  }, timeoutMs);
  res.once('finish', () => clearTimeout(timer));
  res.once('close', () => clearTimeout(timer));
  next();
});

// Health check + Firestore connectivity check
app.get('/health', async (req, res) => {
  try {
    await db.collection('_meta').limit(1).get();
    res.json({ status: 'ok', database: 'cloud-firestore', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

app.get('/api/events/revision', verifyFirebaseToken, (req, res) => {
  res.json({ revision: systemRevision });
});

// Route mounts
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/slots', require('./routes/slotRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Dorm Delivery API running on port ${PORT}`);
});
