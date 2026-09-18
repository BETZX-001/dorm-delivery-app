// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../authMiddleware');
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  getRunnerOrders,
  getOrdersForSlot,
  updateOrderStatus,
} = require('../controllers/orderController');

router.use(verifyFirebaseToken);

router.post('/', placeOrder);
router.get('/mine', getMyOrders);
router.get('/runner/mine', getRunnerOrders);
router.get('/slot/:slotId', getOrdersForSlot);
router.get('/:orderId', getOrderById);
router.patch('/:orderId/status', updateOrderStatus);

module.exports = router;
