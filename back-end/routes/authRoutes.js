const express = require('express');
const { claimPassword, isPasswordClaimed } = require('../passwordRegistry');
const { verifyFirebaseToken } = require('../authMiddleware');

const router = express.Router();

router.post('/password/check', async (req, res) => {
  if (!req.body.password) return res.status(400).json({ error: 'กรุณากรอกรหัสผ่าน' });
  try {
    if (await isPasswordClaimed(req.body.password)) {
      return res.status(409).json({ error: 'รหัสผ่านซ้ำ กรุณาตั้งรหัสผ่านอื่น', code: 'PASSWORD_DUPLICATE' });
    }
    return res.json({ available: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ตรวจสอบรหัสผ่านไม่สำเร็จ' });
  }
});

router.post('/password/claim', verifyFirebaseToken, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'กรุณากรอกรหัสผ่าน' });
  try {
    const result = await claimPassword(req.user.email, password);
    if (result.duplicate) return res.status(409).json({ error: 'รหัสผ่านซ้ำ กรุณาตั้งรหัสผ่านอื่น', code: 'PASSWORD_DUPLICATE' });
    return res.json({ available: true, claimed_new: result.claimedNew });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ตรวจสอบรหัสผ่านไม่สำเร็จ' });
  }
});

module.exports = router;
