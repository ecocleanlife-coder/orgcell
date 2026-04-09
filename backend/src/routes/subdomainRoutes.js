// subdomainRoutes.js
// §26-1-1 Subdomain 자동배정 라우트

const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middlewares/authMiddleware');
const { assign, confirmBonGwanHandler, getBonGwanListHandler } = require('../controllers/subdomainController');

// 온보딩 시 subdomain 배정 (인증 불필요 — 가입 전 호출 가능)
router.post('/assign', assign);

// 본관 확정 전환 (인증 필요)
router.put('/confirm-bon-gwan', authenticate, confirmBonGwanHandler);

// 본관 목록 조회 (자동완성)
router.get('/bon-gwan', getBonGwanListHandler);

module.exports = router;
