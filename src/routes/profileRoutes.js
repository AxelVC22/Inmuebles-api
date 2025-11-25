const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
} = require('../controllers/profileController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getUserProfile);
router.put('/', verifyToken, updateUserProfile);
router.put('/change-password', verifyToken, updateUserPassword);

module.exports = router;
