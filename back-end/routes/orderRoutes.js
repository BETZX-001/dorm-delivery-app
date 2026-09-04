// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../authMiddleware');
const {
  placeOrder,
  getMyOrders,
  getOrdersForSlot,
  updateOrderStatus,
} = require('../controllers/orderController');

router.use(verifyFirebaseToken);

router.post('/', placeOrder);
router.get('/mine', getMyOrders);
router.get('/slot/:slotId', getOrdersForSlot);
router.patch('/:orderId/status', updateOrderStatus);

module.exports = router;
