// controllers/slotController.js
const pool = require('../db');

// POST /api/slots
// Runner creates a new delivery slot.
async function createSlot(req, res) {
  const { uid } = req.user;
  const { destination, cut_off_time, max_orders, fee } = req.body;

  if (!destination || !cut_off_time || !max_orders) {
    return res.status(400).json({ error: 'destination, cut_off_time and max_orders are required' });
  }

  if (Number(max_orders) < 1) {
    return res.status(400).json({ error: 'max_orders must be at least 1' });
  }

  if (fee !== undefined && Number(fee) < 0) {
    return res.status(400).json({ error: 'fee cannot be negative' });
  }

  try {
    const [userRows] = await pool.query(
      'SELECT dorm_name FROM Users WHERE user_id = :uid',
      { uid }
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const dorm_name = userRows[0].dorm_name;

    const [result] = await pool.query(
      `INSERT INTO Slots (runner_id, destination, dorm_name, cut_off_time, max_orders, current_orders, fee, status)
       VALUES (:uid, :destination, :dorm_name, :cut_off_time, :max_orders, 0, :fee, 'OPEN')`,
      { uid, destination, dorm_name, cut_off_time, max_orders, fee: fee ?? 0 }
    );

    const [rows] = await pool.query('SELECT * FROM Slots WHERE slot_id = :id', {
      id: result.insertId,
    });

    return res.status(201).json({ slot: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create slot' });
  }
}

// GET /api/slots/available
// Requester fetches slots matching their dorm, still open, not past cut-off, with room left.
async function getAvailableSlots(req, res) {
  const { uid } = req.user;

  try {
    const [userRows] = await pool.query(
      'SELECT dorm_name FROM Users WHERE user_id = :uid',
      { uid }
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const dorm_name = userRows[0].dorm_name;

    const [slots] = await pool.query(
      `SELECT s.*, u.name AS runner_name, u.avg_rating AS runner_rating
       FROM Slots s
       JOIN Users u ON u.user_id = s.runner_id
       WHERE s.dorm_name = :dorm_name
         AND s.status = 'OPEN'
         AND s.cut_off_time > NOW()
         AND s.current_orders < s.max_orders
       ORDER BY s.cut_off_time ASC`,
      { dorm_name }
    );

    return res.json({ slots });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch available slots' });
  }
}

// GET /api/slots/mine
// Runner views the slots they created.
async function getMySlots(req, res) {
  const { uid } = req.user;
  try {
    const [slots] = await pool.query(
      'SELECT * FROM Slots WHERE runner_id = :uid ORDER BY created_at DESC',
      { uid }
    );
    return res.json({ slots });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch slots' });
  }
}

// GET /api/slots/:slotId
async function getSlotById(req, res) {
  const { slotId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.name AS runner_name, u.avg_rating AS runner_rating
       FROM Slots s JOIN Users u ON u.user_id = s.runner_id
       WHERE s.slot_id = :slotId`,
      { slotId }
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    return res.json({ slot: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch slot' });
  }
}

// PATCH /api/slots/:slotId/status
// Runner manually transitions a slot, e.g. OPEN -> SHOPPING -> COMPLETED.
async function updateSlotStatus(req, res) {
  const { uid } = req.user;
  const { slotId } = req.params;
  const { status } = req.body;

  const allowed = ['OPEN', 'FULL', 'SHOPPING', 'COMPLETED'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM Slots WHERE slot_id = :slotId', { slotId });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    if (rows[0].runner_id !== uid) {
      return res.status(403).json({ error: 'Only the owning runner can update this slot' });
    }

    await pool.query('UPDATE Slots SET status = :status WHERE slot_id = :slotId', {
      status,
      slotId,
    });

    const [updated] = await pool.query('SELECT * FROM Slots WHERE slot_id = :slotId', { slotId });
    return res.json({ slot: updated[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update slot status' });
  }
}

module.exports = {
  createSlot,
  getAvailableSlots,
  getMySlots,
  getSlotById,
  updateSlotStatus,
};
