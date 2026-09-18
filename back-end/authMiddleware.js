// middleware/authMiddleware.js
const admin = require('./firebase');

const UNIVERSITY_EMAIL_DOMAIN = '@psu.ac.th';
// Keep privileged accounts server-side. Multiple addresses can be configured as
// a comma-separated ADMIN_EMAILS value without changing the mobile app.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || '6710210025@psu.ac.th')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    if (!decoded.email_verified) {
      return res.status(403).json({ error: 'Email not verified' });
    }

    if (!decoded.email || !decoded.email.endsWith(UNIVERSITY_EMAIL_DOMAIN)) {
      return res.status(403).json({ error: 'Must use a university email' });
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      isAdmin: ADMIN_EMAILS.has(decoded.email.toLowerCase()),
    };

    next();
  } catch (err) {
    // Keep the response generic, but preserve the real Firebase failure in the
    // server log so certificate/network problems are not mistaken for deleted users.
    console.error('Firebase token verification failed:', err.code || 'unknown', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { verifyFirebaseToken, requireAdmin, UNIVERSITY_EMAIL_DOMAIN };
