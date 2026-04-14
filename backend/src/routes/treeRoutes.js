'use strict';

/**
 * treeRoutes.js — GET /api/tree/:subdomain
 * §19: 트리 레이아웃 API (§22/§23/§24 계산 결과 반환)
 */

const express = require('express');
const router  = express.Router();
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const checkAccess = require('../middlewares/accessCheckMiddleware');
const ctrl = require('../controllers/treeController');

// 가상 박물관: 미개설 인물 기준 트리 (/:subdomain 보다 먼저 등록)
router.get('/person/:dbId', optionalAuth, ctrl.getPersonTreeLayout);

// §16: protect(로그인 필수) → checkAccess(입장권 검증) → 트리 레이아웃 반환
router.get('/:subdomain', protect, checkAccess, ctrl.getTreeLayout);

module.exports = router;
