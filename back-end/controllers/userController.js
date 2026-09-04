// controllers/userController.js
const pool = require('../db');
const { UNIVERSITY_EMAIL_DOMAIN } = require('../authMiddleware');

// POST /api/users/sync
// Called right after Firebase login/signup to create-or-update the MySQL profile row.
async function syncUser(req, res) {
  const { uid, email } = req.user;
  const { name, phone, dorm_name, room_number, role } = req.body;

  if (!name || !dorm_name) {
    return res.status(400).json({ error: 'name and dorm_name are required' });
  }

  if (role && !['RUNNER', 'REQUESTER'].includes(role)) {
    return res.status(400).json({ error: 'role must be RUNNER or REQUESTER' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT * FROM Users WHERE user_id = :uid LIMIT 1',
      { uid }
    );

    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO Users (user_id, name, email, phone, dorm_name, room_number, role)
         VALUES (:uid, :name, :email, :phone, :dorm_name, :room_number, :role)`,
        {
          uid,
          name,
          email,
          phone: phone || null,
          dorm_name,
          room_number: room_number || null,
          role: role || 'REQUESTER',
        }
      );
    } else {
      await pool.query(
        `UPDATE Users
         SET name = :name, phone = :phone, dorm_name = :dorm_name, room_number = :room_number
         WHERE user_id = :uid`,
        {
          uid,
          name,
          phone: phone || null,
          dorm_name,
          room_number: room_number || null,
        }
      );
    }

    const [rows] = await pool.query('SELECT * FROM Users WHERE user_id = :uid', { uid });
    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to sync user' });
  }
}

// PATCH /api/users/role
// Lets a user freely switch between RUNNER and REQUESTER.
async function switchRole(req, res) {
  const { uid } = req.user;
  const { role } = req.body;

  if (!['RUNNER', 'REQUESTER'].includes(role)) {
    return res.status(400).json({ error: 'role must be RUNNER or REQUESTER' });
  }

  try {
    await pool.query('UPDATE Users SET role = :role WHERE user_id = :uid', { role, uid });
    const [rows] = await pool.query('SELECT * FROM Users WHERE user_id = :uid', { uid });
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to switch role' });
  }
}

// GET /api/users/me
async function getMe(req, res) {
  const { uid } = req.user;
  try {
    const [rows] = await pool.query('SELECT * FROM Users WHERE user_id = :uid', { uid });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found, call /sync first' });
    }
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// PATCH /api/users/push-token
async function updatePushToken(req, res) {
  const { uid } = req.user;
  const { push_token } = req.body;

  if (!push_token) {
    return res.status(400).json({ error: 'push_token is required' });
  }

  try {
    await pool.query('UPDATE Users SET push_token = :push_token WHERE user_id = :uid', {
      push_token,
      uid,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update push token' });
  }
}

module.exports = { syncUser, switchRole, getMe, updatePushToken, UNIVERSITY_EMAIL_DOMAIN };
