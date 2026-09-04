// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../authMiddleware');
const { createReport, getMyReports } = require('../controllers/reportController');

router.use(verifyFirebaseToken);

router.post('/', createReport);
router.get('/mine', getMyReports);

module.exports = router;
