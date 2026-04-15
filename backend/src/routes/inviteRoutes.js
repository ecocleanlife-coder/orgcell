const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inviteController');
const inv  = require('../controllers/invitationController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');

// ── 기존 (family_invites 테이블) ─────────────────────────────────────────────
router.post('/create', protect, ctrl.createInvite);
router.get('/info', ctrl.getInviteInfo);
router.post('/accept', protect, ctrl.acceptInvite);
router.post('/send-email', protect, ctrl.sendInviteEmailHandler);
router.get('/status', protect, ctrl.getInviteStatus);
router.post('/resend', protect, ctrl.resendInvite);

// ── §17 신규 (invitations 테이블) ────────────────────────────────────────────
// 고정 경로 먼저 (/:token 보다 위에 있어야 함)
router.get('/verify/:token',     inv.verifyToken);
router.post('/accept/:token',    optionalAuth, inv.acceptInvitation);
router.post('/decline/:token',   inv.declineInvitation);

// 박물관별 초대 관리
router.post('/:siteId',          protect, inv.createInvitation);
router.get('/:siteId',           protect, inv.listInvitations);
router.delete('/:siteId/:id',    protect, inv.cancelInvitation);
router.post('/:siteId/:id/resend', protect, inv.resendInvitation);

// ── 기존 프라이버시 선택 (비로그인 접근 가능) ───────────────────────────────
router.get('/:token/info', ctrl.getInviteInfoByToken);
router.post('/:token/privacy-choice', ctrl.privacyChoice);

module.exports = router;
