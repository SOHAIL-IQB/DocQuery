const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { serializeUser } = require('./authController');
const { getStorageUsed, MAX_TOTAL_STORAGE, MAX_DOCUMENTS } = require('../middleware/uploadMiddleware');

const AVATARS = new Set(['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7', 'avatar8']);

// @desc    Get dashboard analytics for user
// @route   GET /api/users/analytics
// @access  Private
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const chatIds = await Chat.find({ userId }).distinct('_id');

    const [storage, readyDocuments, totalChunks, questionsAsked] = await Promise.all([
      getStorageUsed(userId),
      Document.countDocuments({ userId, status: 'Ready' }),
      DocumentChunk.countDocuments({ userId }),
      Message.countDocuments({ chatId: { $in: chatIds }, role: 'user' }),
    ]);

    res.json({
      success: true,
      data: {
        totalDocuments: storage.count,
        readyDocuments,
        totalChats: chatIds.length,
        totalChunks,
        questionsAsked,
        storageUsedBytes: storage.bytes,
        storageLimitBytes: MAX_TOTAL_STORAGE,
        documentLimit: MAX_DOCUMENTS,
        memberSince: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & avatar
// @route   PATCH /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 50) : '';
    if (name) user.name = name;
    if (AVATARS.has(req.body.avatar)) user.avatar = req.body.avatar;
    await user.save();
    res.json({ success: true, data: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user password
// @route   POST /api/users/change-password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(String(currentPassword || '')))) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account and ALL associated data
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const chatIds = await Chat.find({ userId }).distinct('_id');

    await Promise.all([
      Message.deleteMany({ chatId: { $in: chatIds } }),
      DocumentChunk.deleteMany({ userId }),
      Document.deleteMany({ userId }),
      Chat.deleteMany({ userId }),
    ]);
    await User.findByIdAndDelete(userId);

    res.clearCookie('token');
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardAnalytics,
  updateProfile,
  updatePassword,
  deleteAccount,
};
