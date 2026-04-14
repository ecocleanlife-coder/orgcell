/**
 * careerRoutes.js — §8-C 주요약력 API
 * 마운트: /api/career
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/careerController');
const { protect } = require('../middlewares/authMiddleware');

// GET    /:siteId          — 목록 (비로그인 가능, 공개만 반환)
router.get('/:siteId', ctrl.listItems);

// POST   /:siteId          — 항목 추가 (관장 전용)
router.post('/:siteId', protect, ctrl.createItem);

// PUT    /:siteId/reorder  — 순서 저장 (reorder 먼저 등록 → /:itemId 충돌 방지)
router.put('/:siteId/reorder', protect, ctrl.reorderItems);

// PUT    /:siteId/:itemId  — 항목 수정
router.put('/:siteId/:itemId', protect, ctrl.updateItem);

// DELETE /:siteId/:itemId  — 항목 삭제
router.delete('/:siteId/:itemId', protect, ctrl.deleteItem);

module.exports = router;
