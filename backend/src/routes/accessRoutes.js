/**
 * accessRoutes.js — 전시관 접근 제어 API
 *
 * GET  /api/access/:siteId/:personId/check    — 접근 권한 확인
 * POST /api/access/:siteId/:personId/request  — 접근 요청
 * GET  /api/access/:siteId/requests           — 요청 목록 (소유자)
 * PUT  /api/access/respond/:requestId         — 승인/거절
 */
const express = require('express');
const router = express.Router();
const accessController = require('../controllers/accessController');

// 인증 미들웨어 (선택적: 비로그인도 check 가능)
let optionalAuth, requireAuth;
try {
    const authMiddleware = require('../middlewares/authMiddleware');
    optionalAuth = authMiddleware.optionalAuth || ((req, res, next) => next());
    requireAuth = authMiddleware.protect || ((req, res, next) => next());
} catch {
    optionalAuth = (req, res, next) => next();
    requireAuth = (req, res, next) => next();
}

// 접근 권한 확인 (비로그인도 가능)
router.get('/:siteId/:personId/check', optionalAuth, accessController.checkAccess);

// 접근 요청 (로그인 필수)
router.post('/:siteId/:personId/request', requireAuth, accessController.requestAccess);

// 요청 목록 조회 (소유자/관리자)
router.get('/:siteId/requests', requireAuth, accessController.listRequests);

// 승인/거절
router.put('/respond/:requestId', requireAuth, accessController.respondToRequest);

module.exports = router;
