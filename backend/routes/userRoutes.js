const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  updateProfile,
  updatePassword,
  deleteAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimit');

router.use(protect);

router.get('/analytics', getDashboardAnalytics);
router.patch('/profile', updateProfile);
router.post('/change-password', authLimiter, updatePassword);
router.delete('/account', deleteAccount);

module.exports = router;
