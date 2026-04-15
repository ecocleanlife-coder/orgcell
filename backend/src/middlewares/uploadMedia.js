'use strict';

/**
 * uploadMedia.js — §8-F 음성·동영상 업로드 미들웨어
 *
 * 지원: mp3 / m4a / wav (음성), mp4 / mov (동영상), webm (브라우저 녹음)
 * 미지원: avi → 업로드 시 안내 메시지 반환
 * 용량 한도: 파일당 500MB (동영상 크기 고려)
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/media');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a',
  'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/webm', 'video/webm',
  'video/mp4', 'video/quicktime',
]);

const BLOCKED_EXT = new Set(['.avi', '.wmv', '.flv', '.mkv']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const uid = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, uid + ext);
  },
});

function fileFilter(req, file, cb) {
  const ext  = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXT.has(ext)) {
    return cb(Object.assign(new Error('AVI_NOT_SUPPORTED'), { code: 'AVI_NOT_SUPPORTED' }), false);
  }
  if (ALLOWED_MIME.has(file.mimetype) || ext.match(/\.(mp3|m4a|wav|mp4|mov|webm)$/)) {
    return cb(null, true);
  }
  cb(Object.assign(new Error('UNSUPPORTED_FORMAT'), { code: 'UNSUPPORTED_FORMAT' }), false);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB per file
});
