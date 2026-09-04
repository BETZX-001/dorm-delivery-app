// controllers/reportController.js
const pool = require('../db');

const CATEGORIES = ['LATE_DELIVERY', 'ITEM_ISSUE', 'PAYMENT_DISPUTE', 'BEHAVIOR', 'OTHER'];

// POST /api/reports
async function createReport(req, res) {
  const { uid } = req.user;
  const { order_id, category, description } = req.body;

  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: 'description is required' });
  }
  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of ${CATEGORIES.join(', ')}` });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO Reports (reporter_id, order_id, category, description)
       VALUES (:uid, :order_id, :category, :description)`,
      { uid, order_id: order_id || null, category: category || 'OTHER', description: description.trim() }
    );

    const [rows] = await pool.query('SELECT * FROM Reports WHERE report_id = :id', {
      id: result.insertId,
    });

    return res.status(201).json({ report: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
}

// GET /api/reports/mine
async function getMyReports(req, res) {
  const { uid } = req.user;
  try {
    const [reports] = await pool.query(
      'SELECT * FROM Reports WHERE reporter_id = :uid ORDER BY created_at DESC',
      { uid }
    );
    return res.json({ reports });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

module.exports = { createReport, getMyReports, CATEGORIES };
