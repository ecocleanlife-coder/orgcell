const express = require('express');
const router = express.Router();
const { optionalAuth, protect } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/relationController');

// 조회는 optionalAuth (비로그인도 공개 데이터 볼 수 있음)
router.get('/:siteId/relations', optionalAuth, ctrl.listRelations);

// 생성/삭제는 protect (인증 필수)
router.post('/:siteId/relations', protect, ctrl.createRelation);
router.delete('/:siteId/relations/:relationId', protect, ctrl.deleteRelation);

module.exports = router;
