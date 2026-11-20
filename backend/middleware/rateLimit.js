const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const make = (windowMs, limit, error, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Authenticated routes are limited per user; public ones per IP.
    keyGenerator: (req) => (req.user ? `u:${req.user._id}` : ipKeyGenerator(req.ip)),
    handler: (req, res) => res.status(429).json({ success: false, error }),
    ...extra,
  });

module.exports = {
  // Brute-force protection: only failed attempts count, so normal sign-ins are never blocked.
  authLimiter: make(15 * 60 * 1000, 20, 'Too many failed attempts. Please try again in a few minutes.', {
    skipSuccessfulRequests: true,
  }),
  registerLimiter: make(60 * 60 * 1000, 20, 'Too many accounts created from this network. Please try again later.'),
  chatLimiter: make(60 * 1000, 20, 'You are sending messages too quickly. Please slow down.'),
  uploadLimiter: make(60 * 60 * 1000, 60, 'Upload limit reached. Please try again later.'),
};
