const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/requestController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

// 요청 링크 생성 (로그인 필요)
router.post('/', protect, ctrl.createRequest);

// 요청 정보 조회 (공개 — 슬라이드쇼용)
router.get('/:token', ctrl.getRequest);

// 비로그인 사진 업로드 (공개 — 파일 10장 제한)
router.post('/:token/upload', upload.array('photos', 10), ctrl.uploadToRequest);

module.exports = router;
