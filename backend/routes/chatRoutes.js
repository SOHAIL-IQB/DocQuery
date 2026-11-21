const express = require('express');
const router = express.Router();
const {
  createChat,
  sendMessage,
  streamMessage,
  getAllChats,
  getChatHistory,
  deleteChat,
  renameChat,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { chatLimiter } = require('../middleware/rateLimit');
const { validateObjectId } = require('../middleware/validateObjectId');

const chatIdParam = validateObjectId('chatId', { resource: 'Chat' });
const chatIdBody = validateObjectId('chatId', { source: 'body', resource: 'Chat' });

router.use(protect);

router.get('/', getAllChats);
router.post('/create', createChat);
router.post('/message', chatLimiter, chatIdBody, sendMessage);
router.post('/message/stream', chatLimiter, chatIdBody, streamMessage);
router.get('/:chatId', chatIdParam, getChatHistory);
router.patch('/:chatId/rename', chatIdParam, renameChat);
router.delete('/:chatId', chatIdParam, deleteChat);

module.exports = router;
