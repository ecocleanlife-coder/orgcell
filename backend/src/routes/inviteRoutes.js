const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inviteController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/create', protect, ctrl.createInvite);
router.get('/info', ctrl.getInviteInfo);
router.post('/accept', protect, ctrl.acceptInvite);
router.post('/send-email', protect, ctrl.sendInviteEmailHandler);
router.get('/status', protect, ctrl.getInviteStatus);
router.post('/resend', protect, ctrl.resendInvite);

// 프라이버시 선택 (비로그인 접근 가능)
router.get('/:token/info', ctrl.getInviteInfoByToken);
router.post('/:token/privacy-choice', ctrl.privacyChoice);

module.exports = router;
