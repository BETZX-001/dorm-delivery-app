const express = require('express');
const { verifyFirebaseToken } = require('../authMiddleware');
const { getMessages, getUnread, sendMessage } = require('../controllers/chatController');

const router = express.Router();
router.use(verifyFirebaseToken);
router.get('/unread', getUnread);
router.get('/:orderId', getMessages);
router.post('/:orderId', sendMessage);
module.exports = router;
