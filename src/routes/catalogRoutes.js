const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/catalogController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/categories', verifyToken, getCategories);

module.exports = router;
