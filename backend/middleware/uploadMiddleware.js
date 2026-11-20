const multer = require('multer');
const Document = require('../models/Document');
const { resolveMimeType } = require('../utils/extractText');

const MAX_FILE_SIZE = 10 * 1024 * 1024;     // 10MB per file
const MAX_TOTAL_STORAGE = 50 * 1024 * 1024; // 50MB per user
const MAX_DOCUMENTS = 20;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    // Multer decodes filenames as latin1; restore UTF-8 names (e.g. "résumé.pdf").
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const type = resolveMimeType(file.mimetype, file.originalname);
    if (!type) {
      const err = new Error('Unsupported file type. Upload a PDF, DOCX, TXT or Markdown file.');
      err.status = 415;
      return cb(err);
    }
    file.resolvedMimeType = type;
    cb(null, true);
  },
});

/** Sum of the user's stored document sizes — the source of truth for quota. */
const getStorageUsed = async (userId) => {
  const [row] = await Document.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: '$fileSize' }, count: { $sum: 1 } } },
  ]);
  return { bytes: row?.total || 0, count: row?.count || 0 };
};

const checkStorageLimits = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { bytes, count } = await getStorageUsed(req.user._id);

    if (count >= MAX_DOCUMENTS) {
      return res.status(403).json({
        success: false,
        error: `Document limit reached (${MAX_DOCUMENTS}). Delete a document to upload another.`,
      });
    }
    if (bytes + req.file.size > MAX_TOTAL_STORAGE) {
      return res.status(403).json({
        success: false,
        error: 'Storage limit reached (50 MB). Delete documents to free up space.',
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  checkStorageLimits,
  getStorageUsed,
  MAX_FILE_SIZE,
  MAX_TOTAL_STORAGE,
  MAX_DOCUMENTS,
};
