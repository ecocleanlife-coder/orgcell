'use strict';
/**
 * photoFolderController.js — §8-A 사진자료실 폴더 / 사진 CRUD
 *
 * 라우트: /api/photo-folders
 *   GET    /:siteId              — 폴더 목록 (사진 수 포함)
 *   POST   /:siteId              — 폴더 생성
 *   PUT    /:siteId/reorder      — 드래그 순서 일괄 저장
 *   PUT    /:siteId/:folderId    — 폴더 이름 변경
 *   DELETE /:siteId/:folderId    — 폴더 + 소속 사진 삭제
 *   GET    /:siteId/count        — 사이트 전체 사진 수
 *   GET    /:siteId/:folderId/archive_photos          — 폴더 사진 목록
 *   POST   /:siteId/:folderId/archive_photos          — 사진 업로드 (multer)
 *   PATCH  /:siteId/:folderId/archive_photos/:photoId — 메모/태그/대표 수정
 *   DELETE /:siteId/:folderId/archive_photos/:photoId — 사진 삭제
 */

const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/archive_photos');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── 권한 검증 헬퍼 ───────────────────────────────────────────────────────────
async function verifySite(siteId, userId) {
  const { rows } = await db.query(
    `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [siteId, userId]
  );
  return rows.length > 0;
}

// ─── GET /:siteId — 폴더 목록 ────────────────────────────────────────────────
exports.listFolders = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    const { rows } = await db.query(
      `SELECT f.*, COUNT(p.id)::INT AS photo_count
       FROM photo_folders f
       LEFT JOIN archive_photos p ON p.folder_id = f.id
       WHERE f.site_id = $1
       GROUP BY f.id
       ORDER BY f.sort_order ASC, f.created_at ASC`,
      [siteId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listFolders error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── POST /:siteId — 폴더 생성 ───────────────────────────────────────────────
exports.createFolder = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { name, sort_order = 0 } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: '폴더 이름 필수' });

    const { rows } = await db.query(
      `INSERT INTO photo_folders (site_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *`,
      [siteId, name.trim(), sort_order]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createFolder error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── PUT /:siteId/reorder — 드래그 순서 일괄 저장 ────────────────────────────
exports.reorderFolders = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { orders } = req.body; // [{ id, sort_order }]
    if (!Array.isArray(orders)) return res.status(400).json({ success: false, message: 'orders 배열 필요' });

    for (const { id, sort_order } of orders) {
      await db.query(
        `UPDATE photo_folders SET sort_order = $1 WHERE id = $2 AND site_id = $3`,
        [sort_order, id, siteId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('reorderFolders error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── PUT /:siteId/:folderId — 이름 변경 ──────────────────────────────────────
exports.updateFolder = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: '폴더 이름 필수' });

    const { rows } = await db.query(
      `UPDATE photo_folders SET name = $1 WHERE id = $2 AND site_id = $3 RETURNING *`,
      [name.trim(), folderId, siteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '폴더 없음' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updateFolder error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── DELETE /:siteId/:folderId — 폴더 + 소속 사진 삭제 ───────────────────────
exports.deleteFolder = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    // 소속 사진 파일 삭제
    const { rows: photoRows } = await db.query(
      `SELECT filename FROM archive_photos WHERE folder_id = $1 AND site_id = $2`,
      [folderId, siteId]
    );
    for (const { filename } of photoRows) {
      const fp = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    // DB 삭제 (archive_photos ON DELETE CASCADE via folder_id)
    await db.query(`DELETE FROM archive_photos WHERE folder_id = $1 AND site_id = $2`, [folderId, siteId]);
    await db.query(`DELETE FROM photo_folders WHERE id = $1 AND site_id = $2`, [folderId, siteId]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteFolder error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── GET /:siteId/count — 전체 사진 수 ───────────────────────────────────────
exports.getCount = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    const { rows } = await db.query(
      `SELECT COUNT(*)::INT AS count FROM archive_photos WHERE site_id = $1`,
      [siteId]
    );
    res.json({ success: true, count: rows[0].count });
  } catch (err) {
    console.error('getCount error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── GET /:siteId/:folderId/archive_photos — 폴더 사진 목록 ─────────────────────────
exports.listPhotos = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    const { rows } = await db.query(
      `SELECT * FROM archive_photos WHERE site_id = $1 AND folder_id = $2 ORDER BY created_at ASC`,
      [siteId, folderId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listPhotos error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── POST /:siteId/:folderId/archive_photos — 사진 업로드 ────────────────────────────
exports.uploadPhotos = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const files = req.files;
    if (!files?.length) return res.status(400).json({ success: false, message: '파일 없음' });

    // 200장 초과 검증
    const { rows: cntRows } = await db.query(
      `SELECT COUNT(*)::INT AS cnt FROM archive_photos WHERE site_id = $1`, [siteId]
    );
    if (cntRows[0].cnt + files.length > 200) {
      // 업로드된 파일 롤백
      for (const f of files) {
        const fp = path.join(UPLOADS_DIR, f.filename);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      return res.status(400).json({
        success: false,
        message: '200장 초과. 유료 플랜을 이용해주세요.',
        limitExceeded: true,
      });
    }

    const inserted = [];
    for (const f of files) {
      const url = `/uploads/archive_photos/${f.filename}`;
      const { rows } = await db.query(
        `INSERT INTO archive_photos (site_id, folder_id, filename, original_name, url, mime_type, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [siteId, folderId, f.filename, f.originalname, url, f.mimetype, f.size, req.user.id]
      );
      inserted.push(rows[0]);
    }
    res.json({ success: true, data: inserted });
  } catch (err) {
    console.error('uploadPhotos error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── PATCH /:siteId/:folderId/archive_photos/:photoId — 메모/태그/대표 수정 ──────────
exports.updatePhoto = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    const photoId  = Number(req.params.photoId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { memo, theme_tag, is_representative } = req.body;
    const updates = [];
    const vals    = [];

    if (memo !== undefined)             { updates.push(`memo = $${vals.length + 1}`);             vals.push(memo); }
    if (theme_tag !== undefined)        { updates.push(`theme_tag = $${vals.length + 1}`);        vals.push(theme_tag); }
    if (is_representative !== undefined) {
      // 대표 설정 시 같은 폴더의 기존 대표 해제
      if (is_representative) {
        await db.query(
          `UPDATE archive_photos SET is_representative = FALSE WHERE folder_id = $1 AND site_id = $2`,
          [folderId, siteId]
        );
      }
      updates.push(`is_representative = $${vals.length + 1}`);
      vals.push(is_representative);
    }

    if (!updates.length) return res.status(400).json({ success: false, message: '변경 항목 없음' });

    vals.push(photoId, siteId);
    const { rows } = await db.query(
      `UPDATE archive_photos SET ${updates.join(', ')} WHERE id = $${vals.length - 1} AND site_id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '사진 없음' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updatePhoto error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── DELETE /:siteId/:folderId/archive_photos/:photoId — 사진 삭제 ───────────────────
exports.deletePhoto = async (req, res) => {
  try {
    const siteId  = Number(req.params.siteId);
    const photoId = Number(req.params.photoId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { rows } = await db.query(
      `DELETE FROM archive_photos WHERE id = $1 AND site_id = $2 RETURNING filename`,
      [photoId, siteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '사진 없음' });

    const fp = path.join(UPLOADS_DIR, rows[0].filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);

    res.json({ success: true });
  } catch (err) {
    console.error('deletePhoto error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};
