'use strict';
/**
 * artworkController.js — §8-E 작품실 폴더 / 작품 CRUD
 *
 * 라우트: /api/artwork-folders
 *   GET    /:siteId                            — 폴더 목록 (작품 수 포함)
 *   POST   /:siteId                            — 폴더 생성
 *   PUT    /:siteId/reorder                    — 드래그 순서 저장
 *   GET    /:siteId/usage                      — 용량 현황 (주요자료실+작품실 합산)
 *   PUT    /:siteId/:folderId                  — 이름 변경
 *   DELETE /:siteId/:folderId                  — 폴더+작품 삭제
 *   GET    /:siteId/:folderId/artworks         — 작품 목록
 *   POST   /:siteId/:folderId/artworks         — 업로드 (1GB 검증)
 *   PATCH  /:siteId/:folderId/artworks/:id     — 수정
 *   DELETE /:siteId/:folderId/artworks/:id     — 삭제
 */

const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/artworks');
const MAX_BYTES   = 1 * 1024 * 1024 * 1024; // 1 GB (주요자료실+작품실 합산)
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function detectFileType(mime, originalname = '') {
  const ext = path.extname(originalname).toLowerCase().replace('.', '');
  if (mime === 'application/pdf' || ext === 'pdf')  return 'pdf';
  if (mime === 'video/mp4'       || ext === 'mp4')  return 'mp4';
  if (mime?.startsWith('image/'))                   return ext || 'jpg';
  return ext || 'file';
}

async function verifySite(siteId, userId) {
  const { rows } = await db.query(
    `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [siteId, userId]
  );
  return rows.length > 0;
}

// 주요자료실 + 작품실 합산 용량
async function getUsedBytes(siteId) {
  const [docRes, artRes] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(file_size),0)::BIGINT AS total FROM documents WHERE site_id=$1`, [siteId]),
    db.query(`SELECT COALESCE(SUM(file_size),0)::BIGINT AS total FROM artworks  WHERE site_id=$1`, [siteId]),
  ]);
  return Number(docRes.rows[0].total) + Number(artRes.rows[0].total);
}

// ─── GET /:siteId — 폴더 목록 ─────────────────────────────────────────────────
exports.listFolders = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    const { rows } = await db.query(
      `SELECT f.*, COUNT(a.id)::INT AS artwork_count
       FROM artwork_folders f
       LEFT JOIN artworks a ON a.folder_id = f.id
       WHERE f.site_id = $1
       GROUP BY f.id
       ORDER BY f.sort_order ASC, f.created_at ASC`,
      [siteId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('artworkController.listFolders:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── POST /:siteId — 폴더 생성 ───────────────────────────────────────────────
exports.createFolder = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { name, sort_order = 0, person_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: '폴더 이름 필수' });

    const personId = person_id ? Number(person_id) : req.user.id;
    const { rows } = await db.query(
      `INSERT INTO artwork_folders (site_id, person_id, name, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [siteId, personId, name.trim(), sort_order]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('artworkController.createFolder:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── PUT /:siteId/reorder — 드래그 순서 저장 ─────────────────────────────────
exports.reorderFolders = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ success: false, message: 'orders 배열 필요' });

    for (const { id, sort_order } of orders) {
      await db.query(
        `UPDATE artwork_folders SET sort_order=$1 WHERE id=$2 AND site_id=$3`,
        [sort_order, id, siteId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('artworkController.reorderFolders:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── GET /:siteId/usage — 용량 현황 ──────────────────────────────────────────
exports.getUsage = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const usedBytes = await getUsedBytes(siteId);
    res.json({
      success:    true,
      used_bytes: usedBytes,
      max_bytes:  MAX_BYTES,
      used_mb:    Math.round(usedBytes / 1024 / 1024),
      max_mb:     1024,
    });
  } catch (err) {
    console.error('artworkController.getUsage:', err);
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
      `UPDATE artwork_folders SET name=$1 WHERE id=$2 AND site_id=$3 RETURNING *`,
      [name.trim(), folderId, siteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '폴더 없음' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('artworkController.updateFolder:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── DELETE /:siteId/:folderId — 폴더+작품 삭제 ──────────────────────────────
exports.deleteFolder = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    // 파일 실물 삭제
    const { rows: artRows } = await db.query(
      `SELECT filename FROM artworks WHERE folder_id=$1 AND site_id=$2`,
      [folderId, siteId]
    );
    for (const { filename } of artRows) {
      if (!filename) continue;
      const fp = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await db.query(`DELETE FROM artworks        WHERE folder_id=$1 AND site_id=$2`, [folderId, siteId]);
    await db.query(`DELETE FROM artwork_folders WHERE id=$1        AND site_id=$2`, [folderId, siteId]);
    res.json({ success: true });
  } catch (err) {
    console.error('artworkController.deleteFolder:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── GET /:siteId/:folderId/artworks — 작품 목록 ─────────────────────────────
exports.listArtworks = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    const { rows } = await db.query(
      `SELECT * FROM artworks WHERE site_id=$1 AND folder_id=$2 ORDER BY created_at ASC`,
      [siteId, folderId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('artworkController.listArtworks:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── POST /:siteId/:folderId/artworks — 작품 업로드 ──────────────────────────
exports.uploadArtwork = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '파일 없음' });

    // 1GB 합산 용량 검증
    const usedBytes = await getUsedBytes(siteId);
    if (usedBytes + file.size > MAX_BYTES) {
      fs.unlinkSync(path.join(UPLOADS_DIR, file.filename));
      return res.status(400).json({ success: false, message: '1GB 용량 초과. 유료 플랜을 이용해주세요.', limitExceeded: true });
    }

    const { title, year_created, description, is_public, person_id } = req.body;
    if (!title?.trim()) {
      fs.unlinkSync(path.join(UPLOADS_DIR, file.filename));
      return res.status(400).json({ success: false, message: '작품 제목 필수' });
    }

    const fileType    = detectFileType(file.mimetype, file.originalname);
    const yearCreated = year_created ? Number(year_created) : null;
    const isPublic    = is_public === 'true' || is_public === true;
    const personId    = person_id ? Number(person_id) : req.user.id;
    const fileUrl     = `/uploads/artworks/${file.filename}`;

    const { rows } = await db.query(
      `INSERT INTO artworks
         (site_id, person_id, folder_id, title, file_url, filename, file_type, file_size,
          year_created, description, is_public)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [siteId, personId, folderId, title.trim(), fileUrl, file.filename, fileType, file.size,
       yearCreated, description?.trim() || null, isPublic]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('artworkController.uploadArtwork:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── PATCH /:siteId/:folderId/artworks/:id — 수정 ────────────────────────────
exports.updateArtwork = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const artId    = Number(req.params.id);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { title, year_created, description, is_representative, is_public } = req.body;
    const updates = [];
    const vals    = [];

    if (title        !== undefined) { updates.push(`title=$${vals.length+1}`);        vals.push(title); }
    if (year_created !== undefined) { updates.push(`year_created=$${vals.length+1}`); vals.push(year_created || null); }
    if (description  !== undefined) { updates.push(`description=$${vals.length+1}`);  vals.push(description || null); }
    if (is_public    !== undefined) { updates.push(`is_public=$${vals.length+1}`);    vals.push(is_public); }
    if (is_representative !== undefined) {
      if (is_representative) {
        await db.query(
          `UPDATE artworks SET is_representative=FALSE WHERE folder_id=$1 AND site_id=$2`,
          [folderId, siteId]
        );
      }
      updates.push(`is_representative=$${vals.length+1}`);
      vals.push(is_representative);
    }

    if (!updates.length) return res.status(400).json({ success: false, message: '변경 항목 없음' });

    vals.push(artId, siteId);
    const { rows } = await db.query(
      `UPDATE artworks SET ${updates.join(',')}
       WHERE id=$${vals.length-1} AND site_id=$${vals.length} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '작품 없음' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('artworkController.updateArtwork:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── DELETE /:siteId/:folderId/artworks/:id — 삭제 ───────────────────────────
exports.deleteArtwork = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    const artId  = Number(req.params.id);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { rows } = await db.query(
      `DELETE FROM artworks WHERE id=$1 AND site_id=$2 RETURNING filename`,
      [artId, siteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '작품 없음' });

    if (rows[0].filename) {
      const fp = path.join(UPLOADS_DIR, rows[0].filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('artworkController.deleteArtwork:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};
