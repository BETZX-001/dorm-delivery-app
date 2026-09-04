// controllers/reviewController.js
const pool = require('../db');

// POST /api/reviews
// Requester rates the Runner for a COMPLETED order.
// After inserting, recalculates the Runner's avg_rating as a weighted
// average across all of their reviews (weighted by rating count, i.e. a
// plain mean over all Reviews rows for that runner_id — each new review
// naturally shifts the average less as the runner accumulates more history).
async function submitReview(req, res) {
  const { uid } = req.user;
  const { order_id, rating_score, comment } = req.body;

  if (!order_id || !rating_score) {
    return res.status(400).json({ error: 'order_id and rating_score are required' });
  }
  const score = Number(rating_score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: 'rating_score must be an integer between 1 and 5' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      `SELECT o.order_id, o.requester_id, o.order_status, s.runner_id
       FROM Orders o JOIN Slots s ON s.slot_id = o.slot_id
       WHERE o.order_id = :order_id FOR UPDATE`,
      { order_id }
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];

    if (order.requester_id !== uid) {
      await conn.rollback();
      return res.status(403).json({ error: 'Only the requester on this order can leave a review' });
    }
    if (order.order_status !== 'COMPLETED') {
      await conn.rollback();
      return res.status(409).json({ error: 'Order must be COMPLETED before it can be reviewed' });
    }

    const [existing] = await conn.query('SELECT review_id FROM Reviews WHERE order_id = :order_id', {
      order_id,
    });
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'This order has already been reviewed' });
    }

    await conn.query(
      `INSERT INTO Reviews (order_id, reviewer_id, runner_id, rating_score, comment)
       VALUES (:order_id, :uid, :runner_id, :score, :comment)`,
      { order_id, uid, runner_id: order.runner_id, score, comment: comment || null }
    );

    // Weighted average: AVG() over every review this runner has ever received,
    // so runners with a longer track record aren't swung by a single new score.
    const [[{ newAvg, reviewCount }]] = await conn.query(
      `SELECT AVG(rating_score) AS newAvg, COUNT(*) AS reviewCount
       FROM Reviews WHERE runner_id = :runner_id`,
      { runner_id: order.runner_id }
    );

    await conn.query('UPDATE Users SET avg_rating = :newAvg WHERE user_id = :runner_id', {
      newAvg: Number(newAvg).toFixed(2),
      runner_id: order.runner_id,
    });

    await conn.commit();

    return res.status(201).json({
      review: { order_id, runner_id: order.runner_id, rating_score: score, comment: comment || null },
      runner_new_avg_rating: Number(newAvg).toFixed(2),
      runner_review_count: reviewCount,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit review' });
  } finally {
    conn.release();
  }
}

// GET /api/reviews/runner/:runnerId
async function getReviewsForRunner(req, res) {
  const { runnerId } = req.params;
  try {
    const [reviews] = await pool.query(
      `SELECT r.*, u.name AS reviewer_name
       FROM Reviews r JOIN Users u ON u.user_id = r.reviewer_id
       WHERE r.runner_id = :runnerId
       ORDER BY r.created_at DESC`,
      { runnerId }
    );
    return res.json({ reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

module.exports = { submitReview, getReviewsForRunner };
