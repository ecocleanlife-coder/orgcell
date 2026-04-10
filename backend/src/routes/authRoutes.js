const express = require('express');
const router = express.Router();
const { googleLogin, googleOAuthInit, googleOAuthCallback, getMe, devLogin, requestMagicLink, verifyMagicLink, logout } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/google', googleOAuthInit);              // redirect 방식 (LandingPage/LoginPage)
router.get('/google/callback', googleOAuthCallback); // OAuth 콜백
router.post('/google', googleLogin);                 // credential 방식 (Google One Tap)
router.post('/dev-login', devLogin);
router.post('/logout', logout);
router.post('/magic-link/request', requestMagicLink);
router.post('/magic-link/verify', verifyMagicLink);
router.get('/me', protect, getMe);

module.exports = router;
