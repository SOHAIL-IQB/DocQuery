const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { generateAnswer, streamAnswer } = require('../services/ragService');

const GREETINGS = new Set([
  'hello', 'hi', 'hey', 'yo', 'hola', 'good morning', 'good afternoon', 'good evening',
  'how are you', 'what can you do', 'who are you', 'help',
]);

const isGreeting = (msg) => GREETINGS.has(msg.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').trim());

const greetingAnswer = (user) => {
  const name = user?.name && user.name !== 'User' ? ` ${user.name}` : '';
  return `Hi${name}! I'm your **DocQuery** assistant.\n\nUpload PDFs, Word documents, or text files and ask me anything about them — I'll answer using only what's inside your documents and cite the exact passages I used.\n\nWhat would you like to know?`;
};

/**
 * Loads a chat and verifies ownership. Sends the error response itself and returns null on failure.
 * The id's format is already checked by middleware/validateObjectId on every chat route.
 */
const loadOwnedChat = async (req, res, chatId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({ success: false, error: 'Chat not found' });
    return null;
  }
  if (String(chat.userId) !== String(req.user._id)) {
    res.status(403).json({ success: false, error: 'Not authorized to access this chat' });
    return null;
  }
  return chat;
};

const validatePayload = (req, res) => {
  const { chatId, question, documentIds } = req.body;
  const q = typeof question === 'string' ? question.trim() : '';
  if (!chatId || !q) {
    res.status(400).json({ success: false, error: 'chatId and question are required' });
    return null;
  }
  if (q.length > 4000) {
    res.status(400).json({ success: false, error: 'Question is too long (max 4000 characters).' });
    return null;
  }
  return { chatId, question: q, documentIds: Array.isArray(documentIds) ? documentIds : [] };
};

/** Saves the user's message, auto-titles new chats, and returns prior history. */
const recordQuestion = async (chat, question) => {
  const history = await Message.find({ chatId: chat._id })
    .sort({ createdAt: -1 })
    .limit(6)
    .select('role content')
    .lean();

  await Message.create({ chatId: chat._id, role: 'user', content: question });

  if (chat.title === 'New Chat' || chat.title === 'New Conversation') {
    chat.title = question.length > 48 ? `${question.slice(0, 48).trim()}…` : question;
  }
  chat.updatedAt = new Date();
  await chat.save();

  return history.reverse();
};

// @desc    Create a new chat
// @route   POST /api/chat/create
// @access  Private
const createChat = async (req, res, next) => {
  try {
    const title = String(req.body.title || 'New Chat').trim().slice(0, 100) || 'New Chat';
    const chat = await Chat.create({ userId: req.user._id, title });
    res.status(201).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message and get the full answer in one response
// @route   POST /api/chat/message
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const payload = validatePayload(req, res);
    if (!payload) return;
    const chat = await loadOwnedChat(req, res, payload.chatId);
    if (!chat) return;

    const history = await recordQuestion(chat, payload.question);

    const aiResponse = isGreeting(payload.question)
      ? { answer: greetingAnswer(req.user), sources: [] }
      : await generateAnswer(req.user._id, payload.question, payload.documentIds, history);

    const assistantMessage = await Message.create({
      chatId: chat._id,
      role: 'assistant',
      content: aiResponse.answer,
      sources: aiResponse.sources,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: assistantMessage._id,
        answer: assistantMessage.content,
        sources: assistantMessage.sources,
        chatTitle: chat.title,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message and stream the answer with Server-Sent Events
// @route   POST /api/chat/message/stream
// @access  Private
const streamMessage = async (req, res, next) => {
  let payload;
  let chat;
  try {
    payload = validatePayload(req, res);
    if (!payload) return;
    chat = await loadOwnedChat(req, res, payload.chatId);
    if (!chat) return;
  } catch (error) {
    return next(error);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (event) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Abort the LLM call if the user clicks "Stop" or closes the tab.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  let answer = '';
  let sources = [];
  try {
    const history = await recordQuestion(chat, payload.question);
    send({ type: 'meta', chatTitle: chat.title });

    try {
      if (isGreeting(payload.question)) {
        answer = greetingAnswer(req.user);
        send({ type: 'sources', sources: [] });
        send({ type: 'token', value: answer });
      } else {
        const result = await streamAnswer({
          userId: req.user._id,
          question: payload.question,
          documentIds: payload.documentIds,
          history,
          signal: controller.signal,
          onSources: (s) => {
            sources = s;
            send({ type: 'sources', sources: s });
          },
          onToken: (t) => {
            answer += t;
            send({ type: 'token', value: t });
          },
        });
        answer = result.answer || answer;
      }
    } catch (error) {
      // A stop/disconnect can surface as an abort error from the LLM client — that's not a failure.
      if (!controller.signal.aborted) throw error;
    }

    const stopped = controller.signal.aborted;
    let messageId;
    if (answer.trim() || stopped) {
      // Always record a stopped turn so the conversation reads the same after a reload.
      const content = !answer.trim() ? '_Stopped._' : stopped ? `${answer.trim()}\n\n_— response stopped_` : answer.trim();
      const saved = await Message.create({ chatId: chat._id, role: 'assistant', content, sources });
      messageId = saved._id;
    }
    send({ type: 'done', messageId, stopped });
  } catch (error) {
    console.error('[chat] stream error:', error);
    const isRateLimit = error?.status === 429;
    send({
      type: 'error',
      message: isRateLimit
        ? 'The AI provider is rate-limiting requests right now. Please wait a few seconds and try again.'
        : 'Something went wrong while generating the answer. Please try again.',
    });
  } finally {
    res.end();
  }
};

// @desc    Get all messages for a chat
// @route   GET /api/chat/:chatId
// @access  Private
const getChatHistory = async (req, res, next) => {
  try {
    const chat = await loadOwnedChat(req, res, req.params.chatId);
    if (!chat) return;
    const messages = await Message.find({ chatId: chat._id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: messages, chat });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a chat and its messages
// @route   DELETE /api/chat/:chatId
// @access  Private
const deleteChat = async (req, res, next) => {
  try {
    const chat = await loadOwnedChat(req, res, req.params.chatId);
    if (!chat) return;
    await Message.deleteMany({ chatId: chat._id });
    await chat.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all chats for a user
// @route   GET /api/chat
// @access  Private
const getAllChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: chats });
  } catch (error) {
    next(error);
  }
};

// @desc    Rename a chat
// @route   PATCH /api/chat/:chatId/rename
// @access  Private
const renameChat = async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    const chat = await loadOwnedChat(req, res, req.params.chatId);
    if (!chat) return;
    chat.title = title.slice(0, 100);
    // Renaming is not conversation activity — don't bump the chat to the top of the list.
    await chat.save({ timestamps: false });
    res.json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createChat,
  sendMessage,
  streamMessage,
  getAllChats,
  getChatHistory,
  deleteChat,
  renameChat,
};
