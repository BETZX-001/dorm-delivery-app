const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAdmin } = require('../authMiddleware');
const { getOverview, updateReportStatus } = require('../controllers/adminController');

router.use(verifyFirebaseToken, requireAdmin);
router.get('/overview', getOverview);
router.patch('/reports/:reportId/status', updateReportStatus);

module.exports = router;
