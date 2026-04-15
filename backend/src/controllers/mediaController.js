'use strict';

/**
 * mediaController.js — §8-F 음성·동영상
 *
 * 테이블: voice_recordings (기존 테이블에 title/recorded_at/memo/file_type/file_size/is_public 추가)
 * 경로 기반: /api/media/:siteId
 *
 * 업로드 방식:
 *   A. 파일 업로드  — POST /api/media/:siteId/upload
 *   B. 브라우저 녹음 — POST /api/media/:siteId/record  (webm → mp3 변환, ffmpeg 필요)
 */

const db   = require('../config/db');
const fs   = require('fs');
const path = require('path');

// ── ffmpeg (선택적 로드 — Docker 이미지에 ffmpeg 없으면 녹음 변환 비활성화) ────
let ffmpeg = null;
try {
  ffmpeg = require('fluent-ffmpeg');
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  } catch { /* ffmpeg-installer 없으면 시스템 PATH 사용 */ }
} catch { /* fluent-ffmpeg 미설치 시 녹음 변환 비활성화 */ }

// ── 공용 헬퍼 ─────────────────────────────────────────────────────────────────
function fileUrl(filename) {
  return `/uploads/media/${filename}`;
}

function detectFileType(mimetype = '', originalname = '') {
  const ext = path.extname(originalname).toLowerCase();
  if (/^video\//.test(mimetype) || ['.mp4', '.mov'].includes(ext)) return 'video';
  return 'audio';
}

// ── GET /api/media/:siteId ────────────────────────────────────────────────────
exports.listMedia = async (req, res) => {
  const { siteId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT vr.id, vr.site_id, vr.person_id, vr.file_path, vr.file_type,
              vr.file_size, vr.duration, vr.title, vr.recorded_at, vr.memo,
              vr.is_public, vr.created_at,
              p.name AS person_name
       FROM voice_recordings vr
       LEFT JOIN persons p ON vr.person_id = p.id
       WHERE vr.site_id = $1
       ORDER BY vr.created_at DESC`,
      [siteId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listMedia error:', err);
    res.status(500).json({ success: false, message: '목록 조회 실패' });
  }
};

// ── POST /api/media/:siteId/upload ────────────────────────────────────────────
exports.uploadMedia = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '파일이 없습니다.' });

  const { siteId }    = req.params;
  const { title, recorded_at, memo, person_id, is_public } = req.body;

  const fileType   = detectFileType(req.file.mimetype, req.file.originalname);
  const filePath   = fileUrl(req.file.filename);
  const fileSize   = req.file.size;
  const recorderId = req.user?.id || null;

  try {
    const { rows } = await db.query(
      `INSERT INTO voice_recordings
         (site_id, person_id, recorder_id, file_path, file_type, file_size,
          title, recorded_at, memo, is_public, duration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::DATE,$9,$10,0)
       RETURNING *`,
      [
        siteId,
        person_id  || null,
        recorderId,
        filePath,
        fileType,
        fileSize,
        title?.trim() || req.file.originalname,
        recorded_at || null,
        memo?.trim()  || null,
        is_public === 'true',
      ]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('uploadMedia error:', err);
    // 실패 시 디스크 파일 정리
    const fullPath = path.join(__dirname, '../../uploads/media', req.file.filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    res.status(500).json({ success: false, message: '업로드 실패' });
  }
};

// ── POST /api/media/:siteId/record ────────────────────────────────────────────
// 브라우저 녹음 (webm blob → mp3)
exports.recordAudio = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '녹음 파일이 없습니다.' });

  if (!ffmpeg) {
    // ffmpeg 없으면 webm 그대로 저장
    return exports._saveRecordingFile(req, res, req.file.path, 'audio/webm', '.webm');
  }

  const inputPath  = req.file.path;
  const mp3Name    = path.basename(inputPath, path.extname(inputPath)) + '.mp3';
  const mp3Path    = path.join(path.dirname(inputPath), mp3Name);

  ffmpeg(inputPath)
    .toFormat('mp3')
    .on('end', async () => {
      fs.unlinkSync(inputPath); // webm 삭제
      await exports._saveRecordingFile(req, res, mp3Path, 'audio/mpeg', '.mp3');
    })
    .on('error', async (err) => {
      console.error('ffmpeg convert error:', err);
      // 변환 실패 시 webm 그대로 저장
      await exports._saveRecordingFile(req, res, inputPath, 'audio/webm', '.webm');
    })
    .save(mp3Path);
};

// 녹음 파일 DB 저장 (내부 헬퍼)
exports._saveRecordingFile = async (req, res, filePath, _mime, ext) => {
  const { siteId }     = req.params;
  const { title, recorded_at, memo, person_id } = req.body;
  const filename       = path.basename(filePath);
  const fileUrl_       = `/uploads/media/${filename}`;
  const fileSize       = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  const recorderId     = req.user?.id || null;

  try {
    const { rows } = await db.query(
      `INSERT INTO voice_recordings
         (site_id, person_id, recorder_id, file_path, file_type, file_size,
          title, recorded_at, memo, is_public, duration)
       VALUES ($1,$2,$3,$4,'audio',$5,$6,$7::DATE,$8,false,0)
       RETURNING *`,
      [
        siteId,
        person_id  || null,
        recorderId,
        fileUrl_,
        fileSize,
        title?.trim() || '녹음 파일',
        recorded_at || null,
        memo?.trim()  || null,
      ]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('saveRecordingFile error:', err);
    res.status(500).json({ success: false, message: '녹음 저장 실패' });
  }
};

// ── PATCH /api/media/:siteId/:id ──────────────────────────────────────────────
exports.updateMedia = async (req, res) => {
  const { siteId, id } = req.params;
  const { title, recorded_at, memo, is_public } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE voice_recordings
       SET title       = COALESCE($1, title),
           recorded_at = COALESCE($2::DATE, recorded_at),
           memo        = COALESCE($3, memo),
           is_public   = COALESCE($4, is_public)
       WHERE id = $5 AND site_id = $6
       RETURNING *`,
      [
        title?.trim() ?? null,
        recorded_at   ?? null,
        memo?.trim()  ?? null,
        is_public !== undefined ? is_public : null,
        id,
        siteId,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '항목 없음' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updateMedia error:', err);
    res.status(500).json({ success: false, message: '수정 실패' });
  }
};

// ── DELETE /api/media/:siteId/:id ─────────────────────────────────────────────
exports.deleteMedia = async (req, res) => {
  const { siteId, id } = req.params;

  try {
    const { rows } = await db.query(
      `DELETE FROM voice_recordings WHERE id = $1 AND site_id = $2 RETURNING *`,
      [id, siteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '항목 없음' });

    // 디스크 파일 삭제
    const filename = path.basename(rows[0].file_path);
    const fullPath = path.join(__dirname, '../../uploads/media', filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    res.json({ success: true });
  } catch (err) {
    console.error('deleteMedia error:', err);
    res.status(500).json({ success: false, message: '삭제 실패' });
  }
};
