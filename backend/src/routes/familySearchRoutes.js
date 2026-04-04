const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    getFsAuthUrl,
    fsCallback,
    fsStatus,
    fsDisconnect,
    getFsTree,
    getFsPerson,
    importTree,
    addPersons,
    listMemories,
    importMemories,
} = require('../controllers/familySearchController');

// OAuth
router.get('/auth', protect, getFsAuthUrl);
router.post('/callback', protect, fsCallback);
router.get('/status', protect, fsStatus);
router.post('/disconnect', protect, fsDisconnect);

// 인물 조회
router.get('/person/:fsPersonId', protect, getFsPerson);

// 가족트리 가져오기 (큐 방식, 미리보기만)
router.get('/tree/import', protect, importTree);

// 관장 확인 후 인물 저장
router.post('/tree/add', protect, addPersons);

// Memories 조회 + 저장
router.get('/memories/list', protect, listMemories);
router.post('/memories/import', protect, importMemories);

// 레거시: 기존 가계도 가져오기
router.get('/tree/:siteId', protect, getFsTree);

module.exports = router;
