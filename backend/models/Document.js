const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Processing', 'Ready', 'Failed'],
    default: 'Processing',
  },
  // 0–100, updated while embeddings are generated so the UI can show real progress
  progress: {
    type: Number,
    default: 0,
  },
  chunkCount: {
    type: Number,
    default: 0,
  },
  characterCount: {
    type: Number,
    default: 0,
  },
  // Human-readable reason when status === 'Failed'
  error: {
    type: String,
  },
  // AI-generated after processing (only when an LLM key is configured)
  summary: {
    type: String,
  },
  suggestedQuestions: {
    type: [String],
    default: undefined,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Document', documentSchema);
