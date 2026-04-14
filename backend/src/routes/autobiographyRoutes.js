/**
 * autobiographyRoutes.js — §8-D 자서전 API
 * 마운트: /api/autobiography
 */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();
const ctrl     = require('../controllers/autobiographyController');
const { protect } = require('../middlewares/authMiddleware');

// ── multer 설정 ───────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads/autobiography');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_EXTS = new Set(['.txt', '.doc', '.docx', '.hwp', '.hwpx', '.pdf']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.has(ext)) return cb(null, true);
    cb(new Error(`허용되지 않는 파일 형식: ${ext}`));
  },
});

// ── 라우트 ────────────────────────────────────────────────────────────────────
router.get('/:siteId',                         ctrl.listChapters);
router.post('/:siteId/chapters',               protect, ctrl.createChapter);
// reorder 먼저 등록 (/:id 패턴과 충돌 방지)
router.put('/:siteId/chapters/reorder',        protect, ctrl.reorderChapters);
router.put('/:siteId/chapters/:id',            protect, ctrl.updateChapter);
router.delete('/:siteId/chapters/:id',         protect, ctrl.deleteChapter);
router.post('/:siteId/upload',                 protect, upload.single('file'), ctrl.uploadFile);

module.exports = router;
