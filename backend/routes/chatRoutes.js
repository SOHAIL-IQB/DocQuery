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

router.use(protect);

router.get('/', getAllChats);
router.post('/create', createChat);
router.post('/message', chatLimiter, sendMessage);
router.post('/message/stream', chatLimiter, streamMessage);
router.get('/:chatId', getChatHistory);
router.patch('/:chatId/rename', renameChat);
router.delete('/:chatId', deleteChat);

module.exports = router;
