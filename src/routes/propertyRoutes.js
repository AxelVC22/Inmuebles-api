const express = require('express');
const router = express.Router();
const { createProperty } = require('../controllers/propertyController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, authorizeRole('Arrendador'), createProperty);
//router.get('/', getProperties);
// En tu archivo de rutas
router.post(
  '/properties/:id/images',
  (req, res, next) => {
    upload.array('imagenes', 5)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `Error de carga: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadPropertyImages,
);

module.exports = router;
