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
} = require('../controllers/propertyController');

router.get('/', searchProperties);
router.get('/my-properties', verifyToken, authorizeRole(['Arrendador']), getMyProperties);
router.get('/:id', getPropertyById);
router.get('/:id/images', getFilesByProperty);
router.post('/', verifyToken, authorizeRole(['Arrendador']), createProperty);
router.put('/:id', verifyToken, authorizeRole(['Arrendador']), updateProperty);
router.post(
  '/:id/images',
  verifyToken,
  authorizeRole(['Arrendador']),
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
router.delete(
  '/:id/images/:imgId',
  verifyToken,
  authorizeRole(['Arrendador']),
  deletePropertyImage,
);

module.exports = router;
