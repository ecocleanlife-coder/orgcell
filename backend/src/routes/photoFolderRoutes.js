const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/photoFolderController');
const { protect } = require('../middlewares/authMiddleware');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

// ── multer 설정 (사진자료실 전용) ──────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads/archive_photos');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    cb(null, unique + ext);
  },
});
const fileFilter = (_req, file, cb) => {
  const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'].includes(file.mimetype);
  cb(null, ok);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

// ── 라우트 정의 ───────────────────────────────────────────────────────────────
// NOTE: 'count' 와 'reorder' 를 /:folderId 보다 먼저 선언해야 충돌 없음

router.get(   '/:siteId',                          ctrl.listFolders);
router.post(  '/:siteId',         protect,         ctrl.createFolder);
router.put(   '/:siteId/reorder', protect,         ctrl.reorderFolders);
router.get(   '/:siteId/count',                    ctrl.getCount);
router.put(   '/:siteId/:folderId',           protect,          ctrl.updateFolder);
router.delete('/:siteId/:folderId',           protect,          ctrl.deleteFolder);
router.get(   '/:siteId/:folderId/photos',                      ctrl.listPhotos);
router.post(  '/:siteId/:folderId/photos',    protect, upload.array('photos', 30), ctrl.uploadPhotos);
router.patch( '/:siteId/:folderId/photos/:photoId', protect,    ctrl.updatePhoto);
router.delete('/:siteId/:folderId/photos/:photoId', protect,    ctrl.deletePhoto);

module.exports = router;
