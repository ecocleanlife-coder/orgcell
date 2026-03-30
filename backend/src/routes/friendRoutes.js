const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/friendController');

// 모든 친구 API는 인증 필수
router.post('/request', protect, ctrl.sendRequest);
router.post('/accept', protect, ctrl.acceptRequest);
router.post('/reject', protect, ctrl.rejectRequest);
router.get('/list', protect, ctrl.listFriends);
router.get('/pending', protect, ctrl.listPending);
router.post('/visit', protect, ctrl.recordVisit);
router.get('/visitors', protect, ctrl.listVisitors);

module.exports = router;
