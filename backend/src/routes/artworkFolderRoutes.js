const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/artworkController');
const { protect } = require('../middlewares/authMiddleware');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

// ── multer 설정 (작품실 전용) ──────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads/artworks');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    cb(null, unique + ext);
  },
});

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/heic',
  'application/pdf',
  'video/mp4',
]);
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.pdf', '.mp4']);

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, ALLOWED_MIMES.has(file.mimetype) || ALLOWED_EXTS.has(ext));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB per file

// ── 라우트 정의 ───────────────────────────────────────────────────────────────
// NOTE: 'usage' 와 'reorder' 를 /:folderId 보다 먼저 선언해야 충돌 없음

router.get(   '/:siteId',                          ctrl.listFolders);
router.post(  '/:siteId',         protect,         ctrl.createFolder);
router.put(   '/:siteId/reorder', protect,         ctrl.reorderFolders);
router.get(   '/:siteId/usage',                    ctrl.getUsage);
router.put(   '/:siteId/:folderId',           protect,          ctrl.updateFolder);
router.delete('/:siteId/:folderId',           protect,          ctrl.deleteFolder);
router.get(   '/:siteId/:folderId/artworks',                    ctrl.listArtworks);
router.post(  '/:siteId/:folderId/artworks',  protect, upload.single('file'), ctrl.uploadArtwork);
router.patch( '/:siteId/:folderId/artworks/:id', protect,       ctrl.updateArtwork);
router.delete('/:siteId/:folderId/artworks/:id', protect,       ctrl.deleteArtwork);

module.exports = router;
