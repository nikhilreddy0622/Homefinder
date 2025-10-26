const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  updateDetails,
  updatePassword,
  verifyEmail,
  verifyEmailWithOTP
  // Removed resetPasswordWithTemp
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email-otp', verifyEmailWithOTP); // New OTP verification endpoint
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/forgotpassword', forgotPassword);
// Removed resetpassword/temp route
router.get('/verify-email/:verificationtoken', verifyEmail); // Deprecated but kept for backward compatibility

module.exports = router;