const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const make = (windowMs, limit, error) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Authenticated routes are limited per user; public ones per IP.
    keyGenerator: (req) => (req.user ? `u:${req.user._id}` : ipKeyGenerator(req.ip)),
    handler: (req, res) => res.status(429).json({ success: false, error }),
  });

module.exports = {
  authLimiter: make(15 * 60 * 1000, 30, 'Too many sign-in attempts. Please try again in a few minutes.'),
  chatLimiter: make(60 * 1000, 20, 'You are sending messages too quickly. Please slow down.'),
  uploadLimiter: make(60 * 60 * 1000, 40, 'Upload limit reached. Please try again later.'),
};
