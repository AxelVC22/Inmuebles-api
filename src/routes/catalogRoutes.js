const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/catalogController');

router.get('/categories', getCategories);

module.exports = router;
