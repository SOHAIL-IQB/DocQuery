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
const { validateObjectId } = require('../middleware/validateObjectId');

const documentId = validateObjectId('id', { resource: 'Document' });

router.use(protect);

router.get('/', getDocuments);
router.post('/upload', uploadLimiter, upload.single('document'), checkStorageLimits, uploadDocument);
router.get('/:id', documentId, getDocument);
router.patch('/:id/rename', documentId, renameDocument);
router.delete('/:id', documentId, deleteDocument);

module.exports = router;
