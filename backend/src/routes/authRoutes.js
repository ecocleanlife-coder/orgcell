const express = require('express');
const router = express.Router();
const { googleLogin, getMe, devLogin, requestMagicLink, verifyMagicLink, logout } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/google', googleLogin);
router.post('/dev-login', devLogin);
router.post('/logout', logout);
router.post('/magic-link/request', requestMagicLink);
router.post('/magic-link/verify', verifyMagicLink);
router.get('/me', protect, getMe);

module.exports = router;
