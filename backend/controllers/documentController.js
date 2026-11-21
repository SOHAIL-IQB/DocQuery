const Document = require('../models/Document');
const User = require('../models/User');
const DocumentChunk = require('../models/DocumentChunk');
const { extractText } = require('../utils/extractText');
const { chunkText } = require('../utils/chunkText');
const { generateEmbeddings } = require('../utils/embeddings');
const { generateDocumentInsights } = require('../services/ragService');

const MAX_CHUNKS = 400;
const EMBED_BATCH = 16;

const notFound = (res) => res.status(404).json({ success: false, error: 'Document not found' });

/**
 * Runs extraction → chunking → embedding → insights in the background,
 * updating the document's progress so the UI can show it live.
 */
const processDocument = async (doc, buffer, mimeType, userId) => {
  const fail = async (message) => {
    await Document.updateOne({ _id: doc._id }, { status: 'Failed', error: message, progress: 0 });
    await DocumentChunk.deleteMany({ documentId: doc._id });
    console.warn(`[docs] ${doc._id} failed: ${message}`);
  };

  try {
    const text = await extractText(buffer, mimeType);
    const chunks = chunkText(text);

    if (chunks.length > MAX_CHUNKS) {
      return fail(`Document is too long (${chunks.length} sections). The limit is ${MAX_CHUNKS} — try splitting it into smaller files.`);
    }

    await Document.updateOne({ _id: doc._id }, { characterCount: text.length, progress: 5 });

    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      // Stop early if the user deleted the document mid-processing.
      if (!(await Document.exists({ _id: doc._id }))) return;

      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vectors = await generateEmbeddings(batch);
      await DocumentChunk.insertMany(
        batch.map((t, j) => ({
          documentId: doc._id,
          userId,
          text: t,
          embedding: vectors[j],
          chunkIndex: i + j,
        }))
      );

      const progress = 5 + Math.round(((i + batch.length) / chunks.length) * 85);
      await Document.updateOne({ _id: doc._id }, { progress });
    }

    const insights = await generateDocumentInsights(doc.fileName, text);

    const updated = await Document.findOneAndUpdate(
      { _id: doc._id },
      {
        status: 'Ready',
        progress: 100,
        chunkCount: chunks.length,
        ...(insights?.summary ? { summary: insights.summary } : {}),
        ...(insights?.suggestedQuestions?.length ? { suggestedQuestions: insights.suggestedQuestions } : {}),
      }
    );
    if (!updated) {
      // Deleted while we were finishing up — clean up orphans.
      await DocumentChunk.deleteMany({ documentId: doc._id });
      return;
    }
    console.log(`[docs] ${doc._id} ready (${chunks.length} chunks)`);
  } catch (err) {
    console.error(`[docs] processing error for ${doc._id}:`, err);
    await fail(err.message?.startsWith('No readable text') ? err.message : 'We could not read this file. It may be corrupted or password-protected.');
  }
};

// @desc    Upload a document and process it in the background
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res, next) => {
  try {
    const newDoc = await Document.create({
      userId: req.user._id,
      fileName: req.file.originalname.slice(0, 200),
      fileSize: req.file.size,
      mimeType: req.file.resolvedMimeType,
      status: 'Processing',
    });

    await User.updateOne({ _id: req.user._id }, { $inc: { totalStorageUsed: req.file.size } });

    res.status(202).json({
      success: true,
      message: 'Document uploaded and is now processing in the background.',
      data: newDoc,
    });

    processDocument(newDoc, req.file.buffer, req.file.resolvedMimeType, req.user._id);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all documents for a user
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single document
// @route   GET /api/documents/:id
// @access  Private
const getDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!document) return notFound(res);
    res.json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

// @desc    Rename a document
// @route   PATCH /api/documents/:id/rename
// @access  Private
const renameDocument = async (req, res, next) => {
  try {
    const newName = String(req.body.newName ?? req.body.fileName ?? '').trim();
    if (!newName) {
      return res.status(400).json({ success: false, error: 'New name is required' });
    }

    const document = await Document.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { fileName: newName.slice(0, 200) },
      { new: true }
    );
    if (!document) return notFound(res);

    res.json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a document and its embeddings
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!document) return notFound(res);

    await DocumentChunk.deleteMany({ documentId: document._id });
    await User.updateOne({ _id: req.user._id }, { $inc: { totalStorageUsed: -document.fileSize } });
    await User.updateOne({ _id: req.user._id, totalStorageUsed: { $lt: 0 } }, { totalStorageUsed: 0 });

    res.json({ success: true, data: { message: 'Document removed' } });
  } catch (error) {
    next(error);
  }
};

/** Documents left in "Processing" by a server restart can never finish — mark them failed. */
const recoverInterruptedDocuments = async () => {
  const { modifiedCount } = await Document.updateMany(
    { status: 'Processing' },
    { status: 'Failed', error: 'Processing was interrupted. Please delete and upload this file again.', progress: 0 }
  );
  if (modifiedCount) console.log(`[docs] marked ${modifiedCount} interrupted document(s) as failed`);
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  renameDocument,
  deleteDocument,
  recoverInterruptedDocuments,
};
