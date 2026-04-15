'use strict';

/**
 * mediaRoutes.js — §8-F 음성·동영상 API
 *
 * GET    /api/media/:siteId           — 목록
 * POST   /api/media/:siteId/upload    — 파일 업로드
 * POST   /api/media/:siteId/record    — 브라우저 녹음 저장 (webm → mp3)
 * PATCH  /api/media/:siteId/:id       — title/memo/recorded_at/is_public 수정
 * DELETE /api/media/:siteId/:id       — 삭제
 */

const router      = require('express').Router();
const ctrl        = require('../controllers/mediaController');
const { protect } = require('../middlewares/authMiddleware');
const uploadMedia = require('../middlewares/uploadMedia');

// multer 에러 처리 래퍼
function withMulterError(handler) {
  return (req, res, next) => {
    const uploader = uploadMedia.single('file');
    uploader(req, res, (err) => {
      if (err) {
        if (err.code === 'AVI_NOT_SUPPORTED') {
          return res.status(400).json({
            success: false,
            message: 'avi 파일은 mp4로 변환 후 업로드해주세요.',
          });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: '파일 크기가 500MB를 초과합니다. 동영상은 업로드 전 용량을 확인해주세요.',
          });
        }
        return res.status(400).json({ success: false, message: err.message || '업로드 오류' });
      }
      handler(req, res, next);
    });
  };
}

router.get(   '/:siteId',         ctrl.listMedia);
router.post(  '/:siteId/upload',  protect, withMulterError(ctrl.uploadMedia));
router.post(  '/:siteId/record',  protect, withMulterError(ctrl.recordAudio));
router.patch( '/:siteId/:id',     protect, ctrl.updateMedia);
router.delete('/:siteId/:id',     protect, ctrl.deleteMedia);

module.exports = router;
