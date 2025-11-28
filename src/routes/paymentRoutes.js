const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const {
  registerPaymentMethod,
  getPaymentMethods,
  registerPayment,
} = require('../controllers/paymentController');

router.post('/methods', verifyToken, registerPaymentMethod);
router.get('/methods', verifyToken, getPaymentMethods);
router.post('/pay', verifyToken, registerPayment);

module.exports = router;
