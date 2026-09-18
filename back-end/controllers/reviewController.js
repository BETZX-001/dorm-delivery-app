const {
  admin, db, COLLECTIONS, normalizeId, docData, docsByIds, docsByIdsSelected, nextNumericId,
} = require('../db');

const reviews = db.collection(COLLECTIONS.reviews);
const orders = db.collection(COLLECTIONS.orders);
const slots = db.collection(COLLECTIONS.slots);
const users = db.collection(COLLECTIONS.users);

async function submitReview(req, res) {
  const { uid } = req.user;
  const { order_id, rating_score, comment, is_anonymous = false } = req.body;
  const score = Number(rating_score);
  if (order_id == null || rating_score == null) return res.status(400).json({ error: 'order_id and rating_score are required' });
  if (!Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ error: 'rating_score must be an integer between 1 and 5' });

  try {
    let reviewId;
    let runnerId;
    let newAverage;
    let reviewCount;
    await db.runTransaction(async (transaction) => {
      const orderRef = orders.doc(String(order_id));
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) { const error = new Error('Order not found'); error.status = 404; throw error; }
      const order = orderSnapshot.data();
      if (order.requester_id !== uid) { const error = new Error('Only the requester on this order can leave a review'); error.status = 403; throw error; }
      if (order.order_status !== 'COMPLETED') { const error = new Error('Order must be COMPLETED before it can be reviewed'); error.status = 409; throw error; }

      const slotSnapshot = await transaction.get(slots.doc(String(order.slot_id)));
      if (!slotSnapshot.exists) { const error = new Error('Slot not found'); error.status = 404; throw error; }
      runnerId = slotSnapshot.data().runner_id;
      const [duplicateSnapshot, runnerReviews] = await Promise.all([
        transaction.get(reviews.where('order_id', '==', normalizeId(order_id)).limit(1)),
        transaction.get(reviews.where('runner_id', '==', runnerId)),
      ]);
      if (!duplicateSnapshot.empty) { const error = new Error('ออร์เดอร์นี้ได้รับการรีวิวแล้ว'); error.status = 409; error.code = 'ALREADY_REVIEWED'; throw error; }
      reviewId = await nextNumericId(transaction, 'reviews');
      const scores = runnerReviews.docs.map((doc) => Number(doc.data().rating_score || 0));
      reviewCount = scores.length + 1;
      newAverage = (scores.reduce((sum, value) => sum + value, 0) + score) / reviewCount;
      transaction.set(reviews.doc(String(reviewId)), {
        review_id: reviewId, order_id: normalizeId(order_id), reviewer_id: uid, runner_id: runnerId,
        rating_score: score, comment: comment || null, is_anonymous: Boolean(is_anonymous), created_at: admin.firestore.Timestamp.now(),
      });
      transaction.update(users.doc(runnerId), { avg_rating: Number(newAverage.toFixed(2)), updated_at: admin.firestore.Timestamp.now() });
    });
    return res.status(201).json({
      review: { review_id: reviewId, order_id: normalizeId(order_id), runner_id: runnerId, rating_score: score, comment: comment || null, is_anonymous: Boolean(is_anonymous) },
      runner_new_avg_rating: newAverage.toFixed(2), runner_review_count: reviewCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to submit review', ...(error.code ? { code: error.code } : {}) });
  }
}

async function hydrateReviews(rows, uid = null) {
  const [userMap, orderMap] = await Promise.all([
    docsByIdsSelected(COLLECTIONS.users, rows.flatMap((review) => [review.reviewer_id, review.runner_id]), ['name']),
    docsByIds(COLLECTIONS.orders, rows.map((review) => review.order_id)),
  ]);
  const slotMap = await docsByIds(COLLECTIONS.slots, [...orderMap.values()].map((order) => order.slot_id));
  return rows.map((review) => {
    const order = orderMap.get(String(review.order_id)) || {};
    const slot = slotMap.get(String(order.slot_id)) || {};
    return {
      ...review, item_name: order.item_name, destination: slot.destination,
      reviewer_name: review.is_anonymous ? null : userMap.get(String(review.reviewer_id))?.name,
      runner_name: userMap.get(String(review.runner_id))?.name,
      ...(uid ? { review_type: review.runner_id === uid ? 'RECEIVED' : 'GIVEN' } : {}),
    };
  });
}

async function getReviewsForRunner(req, res) {
  try {
    const snapshot = await reviews.where('runner_id', '==', req.params.runnerId).get();
    const rows = snapshot.docs.map((doc) => docData(doc, COLLECTIONS.reviews)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ reviews: await hydrateReviews(rows) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

async function getMyReviews(req, res) {
  try {
    const [received, given] = await Promise.all([
      reviews.where('runner_id', '==', req.user.uid).get(),
      reviews.where('reviewer_id', '==', req.user.uid).get(),
    ]);
    const unique = new Map([...received.docs, ...given.docs].map((doc) => [doc.id, docData(doc, COLLECTIONS.reviews)]));
    const rows = [...unique.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ reviews: await hydrateReviews(rows, req.user.uid) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ไม่สามารถโหลดประวัติรีวิวได้' });
  }
}

async function updateReviewPrivacy(req, res) {
  if (typeof req.body.is_anonymous !== 'boolean') {
    return res.status(400).json({ error: 'is_anonymous must be true or false' });
  }
  try {
    const ref = reviews.doc(String(req.params.reviewId));
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: 'ไม่พบรีวิวนี้' });
    if (snapshot.data().reviewer_id !== req.user.uid) {
      return res.status(403).json({ error: 'คุณเปลี่ยนการแสดงชื่อได้เฉพาะรีวิวของตัวเอง' });
    }
    await ref.update({ is_anonymous: req.body.is_anonymous, updated_at: admin.firestore.Timestamp.now() });
    return res.json({ review: docData(await ref.get(), COLLECTIONS.reviews) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'เปลี่ยนการแสดงชื่อไม่สำเร็จ' });
  }
}

module.exports = { submitReview, getReviewsForRunner, getMyReviews, updateReviewPrivacy };
