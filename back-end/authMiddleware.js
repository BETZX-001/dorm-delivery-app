// middleware/authMiddleware.js
const admin = require('./firebase');

const UNIVERSITY_EMAIL_DOMAIN = '@psu.ac.th';

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
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyFirebaseToken, UNIVERSITY_EMAIL_DOMAIN };
