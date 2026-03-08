const express = require('express');
const router = express.Router();
const { googleLogin, getMe, devLogin } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/google', googleLogin);
router.post('/dev-login', devLogin);
router.get('/me', protect, getMe);

module.exports = router;
