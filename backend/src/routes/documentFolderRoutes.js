const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/documentFolderController');
const { protect } = require('../middlewares/authMiddleware');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── multer 설정 (주요자료실 전용) ──────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads/documents');
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
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/haansofthwp', 'application/x-hwp',
  'application/vnd.hancom.hwp', 'application/vnd.hancom.hwpx',
]);

// HWP/HWPX 는 mime 감지 불안정 → 확장자로도 허용
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.pdf', '.doc', '.docx', '.hwp', '.hwpx']);

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const ok  = ALLOWED_MIMES.has(file.mimetype) || ALLOWED_EXTS.has(ext);
  cb(null, ok);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB per file

// ── 라우트 정의 ───────────────────────────────────────────────────────────────
// NOTE: 'usage' 와 'reorder' 를 /:folderId 보다 먼저 선언해야 충돌 없음

router.get(   '/:siteId',                protect,          ctrl.listFolders);
router.post(  '/:siteId',                protect,          ctrl.createFolder);
router.put(   '/:siteId/reorder',        protect,          ctrl.reorderFolders);
router.get(   '/:siteId/usage',                            ctrl.getUsage);
router.put(   '/:siteId/:folderId',      protect,          ctrl.updateFolder);
router.delete('/:siteId/:folderId',      protect,          ctrl.deleteFolder);
router.get(   '/:siteId/:folderId/documents',              ctrl.listDocuments);
router.post(  '/:siteId/:folderId/documents', protect, upload.single('file'), ctrl.uploadDocument);
router.patch( '/:siteId/:folderId/documents/:id', protect, ctrl.updateDocument);
router.delete('/:siteId/:folderId/documents/:id', protect, ctrl.deleteDocument);

module.exports = router;
