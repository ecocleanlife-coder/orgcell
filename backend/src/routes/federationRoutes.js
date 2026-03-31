const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/federationController');

// 모든 페더레이션 API는 인증 필수
router.post('/request', protect, ctrl.createRequest);
router.post('/accept', protect, ctrl.acceptRequest);
router.post('/reject', protect, ctrl.rejectRequest);
router.get('/list', protect, ctrl.listFederations);
router.post('/token', protect, ctrl.generateToken);

// 웜홀 조회 — 페더레이션 JWT 인증 (별도 검증)
router.get('/resolve/:federationId/:nodeId', ctrl.resolveNode);
router.post('/resolve/batch', ctrl.resolveBatch);

// 체인 탐색 (청구항 6) — 다중 홉 순차 탐색
router.post('/chain-resolve', ctrl.chainResolve);

module.exports = router;
