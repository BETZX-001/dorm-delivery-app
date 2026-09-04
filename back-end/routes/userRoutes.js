// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../authMiddleware');
const { syncUser, switchRole, getMe, updatePushToken } = require('../controllers/userController');

router.use(verifyFirebaseToken);

router.post('/sync', syncUser);
router.patch('/role', switchRole);
router.patch('/push-token', updatePushToken);
router.get('/me', getMe);

module.exports = router;
