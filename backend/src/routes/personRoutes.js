const express = require('express');
const router = express.Router();
const { optionalAuth, protect } = require('../middlewares/authMiddleware');
const uploadPerson = require('../middlewares/uploadPerson');
const { convertHeicIfNeeded, autoRotateImage } = require('../middlewares/uploadPerson');
const ctrl = require('../controllers/personController');

// ── 온보딩 본인확인 검색 (§26-3) ── 인증 불필요 (가입 전 호출)
router.post('/search', ctrl.searchPersons);

// ── 기존 인물에 계정 연결 (온보딩 §26-4) ── 인증 필요
router.post('/link-account', protect, ctrl.linkAccount);

// ── 연결 요청 (관장 승인 필요, 온보딩 §26-5) ──
router.post('/link-request', protect, ctrl.requestLink);
router.get('/link-request/:token/approve', ctrl.approveLink);
router.get('/link-request/:token/reject',  ctrl.rejectLink);

// ── OPS 파이프라인 (§26): 인물 생성 + 관계 + path 배정 ──
// POST /api/persons  (siteId 없음 — subdomain + anchor로 식별)
router.post('/', protect, ctrl.createPersonOPS);

// OPS path 조회 — /:siteId 보다 먼저 등록 (라우팅 충돌 방지)
router.get('/path/*', optionalAuth, ctrl.getPersonByPath);

// 사이트 내 인물 이름 검색 (인물 추가 시 기존 인물 검색용)
router.get('/:siteId/search-site', protect, ctrl.searchPersonsInSite);
// 기존 인물 간 관계 연결 (새 인물 생성 없이)
router.post('/:siteId/link-person', protect, ctrl.linkExistingPerson);

// 조회는 optionalAuth (비로그인도 public 데이터 볼 수 있음)
router.get('/:siteId', optionalAuth, ctrl.listPersons);
router.get('/:siteId/:personId(\\d+)', optionalAuth, ctrl.getPerson);

// 생성/수정/삭제는 protect (인증 필수)
router.post('/:siteId', protect, ctrl.createPerson);
router.put('/:siteId/:personId', protect, ctrl.updatePerson);
router.delete('/:siteId/:personId', protect, ctrl.deletePerson);

// 인물 사진 조회
router.get('/:siteId/:personId/photos', optionalAuth, ctrl.listPersonPhotos);

// 사진 업로드 (HEIC 자동 변환 및 일반 이미지 EXIF 보정)
router.post('/:siteId/:personId/photo', protect, uploadPerson.single('photo'), convertHeicIfNeeded, autoRotateImage, ctrl.uploadPhoto);

// 이혼 처리 (§30-2)
router.post('/:siteId/:personId/divorce', protect, ctrl.divorceSpouse);

// oc_id 일괄 부여 (기존 인물 중 oc_id 없는 것에 부여)
router.post('/:siteId/backfill-oc-ids', protect, ctrl.backfillOcIds);

// 관계 누락 인물 자동 복구 (보완 구조)
router.post('/:siteId/repair-relations', protect, ctrl.repairRelations);

module.exports = router;
