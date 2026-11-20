const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isProd = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const serializeUser = (user, token) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  totalStorageUsed: user.totalStorageUsed,
  createdAt: user.createdAt,
  ...(token ? { token } : {}),
});

// Older accounts may have been stored with mixed-case emails.
const findByEmail = (email, raw) =>
  User.findOne({ email: { $in: [...new Set([email, raw])] } });

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const rawEmail = String(req.body.email || '').trim();
    const email = rawEmail.toLowerCase();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim().slice(0, 50);

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    if (await findByEmail(email, rawEmail)) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const user = await User.create({ email, password, ...(name ? { name } : {}) });
    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);
    res.status(201).json({ success: true, data: serializeUser(user, token) });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const rawEmail = String(req.body.email || '').trim();
    const email = rawEmail.toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await findByEmail(email, rawEmail).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOptions);
    res.json({ success: true, data: serializeUser(user, token) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json({ success: true, data: serializeUser(req.user) });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  serializeUser,
};
