const express = require('express');
const router = express.Router();

const {
  contactProperty,
  scheduleVisit,
  getVisits,
  updateVisitStatus,
} = require('../controllers/interactionController');

const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/properties/:id/visit', verifyToken, scheduleVisit);
router.post('/properties/:id/contact', verifyToken, contactProperty);
router.get('/visits', verifyToken, getVisits);
router.put('/visits/:id', verifyToken, updateVisitStatus);

module.exports = router;
