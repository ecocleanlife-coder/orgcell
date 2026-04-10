'use strict';

/**
 * treeRoutes.js — GET /api/tree/:subdomain
 * §19: 트리 레이아웃 API (§22/§23/§24 계산 결과 반환)
 */

const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const checkAccess = require('../middlewares/accessCheckMiddleware');
const ctrl = require('../controllers/treeController');

// §16: protect(로그인 필수) → checkAccess(입장권 검증) → 트리 레이아웃 반환
router.get('/:subdomain', protect, checkAccess, ctrl.getTreeLayout);

module.exports = router;
