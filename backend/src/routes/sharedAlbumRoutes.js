'use strict';

/**
 * sharedAlbumRoutes.js — §8-G 공유앨범
 *
 * GET    /api/shared-album/:siteId                — 앨범 + 사진 목록
 * POST   /api/shared-album/:siteId/photos         — 사진 업로드 (로그인)
 * DELETE /api/shared-album/:siteId/photos/:id     — 삭제 (본인 or 관장)
 * PATCH  /api/shared-album/:siteId/settings       — 공개범위/다운로드 (관장)
 * POST   /api/shared-album/:siteId/share-link     — 공유 링크 생성 (관장)
 * DELETE /api/shared-album/:siteId/share-link     — 링크 무효화 (관장)
 * GET    /api/shared-album/link/:token            — 토큰으로 앨범 접근
 * POST   /api/shared-album/link/:token/photos     — 비로그인 업로드
 */

const router      = require('express').Router();
const ctrl        = require('../controllers/sharedAlbumController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const uploadAlbum = require('../middlewares/uploadSharedAlbum');

// multer 에러 래퍼
function withUpload(handler) {
  return (req, res, next) => {
    uploadAlbum.single('photo')(req, res, (err) => {
      if (err?.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: '파일이 너무 큽니다. (최대 20MB)' });
      }
      if (err?.code === 'INVALID_TYPE' || err) {
        return res.status(400).json({ success: false, message: err.message || '업로드 오류' });
      }
      handler(req, res, next);
    });
  };
}

// 링크 경유 라우트 (먼저 등록 — :siteId와 충돌 방지)
router.get(   '/link/:token',         optionalAuth, ctrl.getByToken);
router.post(  '/link/:token/photos',  optionalAuth, withUpload(ctrl.uploadByToken));

// 사이트 기반 라우트
router.get(   '/:siteId',                    optionalAuth, ctrl.getAlbum);
router.post(  '/:siteId/photos',             protect,      withUpload(ctrl.uploadPhoto));
router.delete('/:siteId/photos/:id',         protect,      ctrl.deletePhoto);
router.patch( '/:siteId/settings',           protect,      ctrl.updateSettings);
router.post(  '/:siteId/share-link',         protect,      ctrl.createShareLink);
router.delete('/:siteId/share-link',         protect,      ctrl.revokeShareLink);

module.exports = router;
