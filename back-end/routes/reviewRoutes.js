// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../authMiddleware');
const { submitReview, getReviewsForRunner, getMyReviews, updateReviewPrivacy } = require('../controllers/reviewController');

router.use(verifyFirebaseToken);

router.post('/', submitReview);
router.get('/mine', getMyReviews);
router.patch('/:reviewId/privacy', updateReviewPrivacy);
router.get('/runner/:runnerId', getReviewsForRunner);

module.exports = router;
