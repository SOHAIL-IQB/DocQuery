const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getDocuments,
  getDocument,
  renameDocument,
  deleteDocument,
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const { upload, checkStorageLimits } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimit');

router.use(protect);

router.get('/', getDocuments);
router.post('/upload', uploadLimiter, upload.single('document'), checkStorageLimits, uploadDocument);
router.get('/:id', getDocument);
router.patch('/:id/rename', renameDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
