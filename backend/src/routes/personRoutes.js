const express = require('express');
const router = express.Router();
const { optionalAuth, protect } = require('../middlewares/authMiddleware');
const uploadPerson = require('../middlewares/uploadPerson');
const { convertHeicIfNeeded, autoRotateImage } = require('../middlewares/uploadPerson');
const ctrl = require('../controllers/personController');

// ── OPS 파이프라인 (§26): 인물 생성 + 관계 + path 배정 ──
// POST /api/persons  (siteId 없음 — subdomain + anchor로 식별)
router.post('/', protect, ctrl.createPersonOPS);

// OPS path 조회 — /:siteId 보다 먼저 등록 (라우팅 충돌 방지)
router.get('/path/*', optionalAuth, ctrl.getPersonByPath);

// 조회는 optionalAuth (비로그인도 public 데이터 볼 수 있음)
router.get('/:siteId', optionalAuth, ctrl.listPersons);

// 생성/수정/삭제는 protect (인증 필수)
router.post('/:siteId', protect, ctrl.createPerson);
router.put('/:siteId/:personId', protect, ctrl.updatePerson);
router.delete('/:siteId/:personId', protect, ctrl.deletePerson);

// 인물 사진 조회
router.get('/:siteId/:personId/photos', optionalAuth, ctrl.listPersonPhotos);

// 사진 업로드 (HEIC 자동 변환 및 일반 이미지 EXIF 보정)
router.post('/:siteId/:personId/photo', protect, uploadPerson.single('photo'), convertHeicIfNeeded, autoRotateImage, ctrl.uploadPhoto);

// oc_id 일괄 부여 (기존 인물 중 oc_id 없는 것에 부여)
router.post('/:siteId/backfill-oc-ids', protect, ctrl.backfillOcIds);

module.exports = router;
