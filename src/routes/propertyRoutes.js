const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const {
  createProperty,
  getPropertyById,
  updateProperty,
  uploadPropertyImages,
  deletePropertyImage,
  getFilesByProperty,
  getMyProperties,
  searchProperties,
  getRecommendedProperties,
} = require('../controllers/propertyController');

router.get('/', searchProperties);
router.get('/my-properties', verifyToken, getMyProperties);
router.get('/recommended', verifyToken, getRecommendedProperties);
router.get('/:id', getPropertyById);
router.get('/:id/images', getFilesByProperty);
router.post('/', verifyToken, createProperty);
router.put('/:id', verifyToken, updateProperty);
router.post(
  '/:id/images',
  verifyToken,
  (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadPropertyImages,
);
router.delete('/:id/images/:imgId', verifyToken, deletePropertyImage);

module.exports = router;
