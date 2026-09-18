// routes/slotRoutes.js
const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../authMiddleware');
const {
  createSlot,
  getAvailableSlots,
  getMySlots,
  getSlotById,
  updateSlotStatus,
  updateSlot,
  deleteSlot,
} = require('../controllers/slotController');

router.use(verifyFirebaseToken);

router.post('/', createSlot);
router.get('/available', getAvailableSlots);
router.get('/mine', getMySlots);
router.get('/:slotId', getSlotById);
router.patch('/:slotId/status', updateSlotStatus);
router.patch('/:slotId', updateSlot);
router.delete('/:slotId', deleteSlot);

module.exports = router;
