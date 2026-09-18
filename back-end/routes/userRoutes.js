// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../authMiddleware');
const { syncUser, switchRole, getMe, getPublicProfile, updateMe, updateProfileImage, updatePushToken } = require('../controllers/userController');

router.use(verifyFirebaseToken);

router.post('/sync', syncUser);
router.patch('/role', switchRole);
router.patch('/push-token', updatePushToken);
router.patch('/me', updateMe);
router.patch('/profile-image', updateProfileImage);
router.get('/me', getMe);
router.get('/:userId/public', getPublicProfile);

module.exports = router;
