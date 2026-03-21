const express = require('express');
const router = express.Router();
const { optionalAuth, protect } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/personController');

// 조회는 optionalAuth (비로그인도 public 데이터 볼 수 있음)
router.get('/:siteId', optionalAuth, ctrl.listPersons);

// 생성/수정/삭제는 protect (인증 필수)
router.post('/:siteId', protect, ctrl.createPerson);
router.put('/:siteId/:personId', protect, ctrl.updatePerson);
router.delete('/:siteId/:personId', protect, ctrl.deletePerson);

module.exports = router;
