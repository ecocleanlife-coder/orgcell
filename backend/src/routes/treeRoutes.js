'use strict';

/**
 * treeRoutes.js — GET /api/tree/:subdomain
 * §19: 트리 레이아웃 API (§22/§23/§24 계산 결과 반환)
 */

const express = require('express');
const router  = express.Router();
const { optionalAuth } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/treeController');

// optionalAuth: 비로그인도 호출 가능 (접근권한 체크는 Phase 5에서 추가)
router.get('/:subdomain', optionalAuth, ctrl.getTreeLayout);

module.exports = router;
