'use strict';

/**
 * uploadSharedAlbum.js — §8-G 공유앨범 업로드 미들웨어
 * 지원: jpg / png / heic  (최대 20MB per file)
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/shared-albums');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const uid = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, uid + ext);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/jpg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) || ['.jpg', '.jpeg', '.png', '.heic'].includes(ext)) {
    return cb(null, true);
  }
  cb(Object.assign(new Error('JPG/PNG/HEIC 파일만 업로드 가능합니다.'), { code: 'INVALID_TYPE' }), false);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});
