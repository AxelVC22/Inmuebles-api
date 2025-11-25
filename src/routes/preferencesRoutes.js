const express = require('express');
const router = express.Router();
const {
  getUserPreferences,
  updateUserPreferences,
} = require('../controllers/preferencesController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/preferences', verifyToken, getUserPreferences);
router.post('/preferences', verifyToken, updateUserPreferences);

module.exports = router;
