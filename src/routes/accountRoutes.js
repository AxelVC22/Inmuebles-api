const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require('../controllers/accountController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

module.exports = router;
