'use strict';
/**
 * documentFolderController.js — §8-B 주요자료실 폴더 / 자료 CRUD
 *
 * 라우트: /api/document-folders
 *   GET    /:siteId                          — 폴더 목록 (자료 수 포함)
 *   POST   /:siteId                          — 폴더 생성
 *   PUT    /:siteId/reorder                  — 드래그 순서 일괄 저장
 *   GET    /:siteId/usage                    — 용량 현황 (bytes)
 *   PUT    /:siteId/:folderId                — 이름 변경
 *   DELETE /:siteId/:folderId                — 폴더 + 소속 자료 삭제
 *   GET    /:siteId/:folderId/documents      — 자료 목록
 *   POST   /:siteId/:folderId/documents      — 자료 업로드 (1GB 검증)
 *   PATCH  /:siteId/:folderId/documents/:id  — 메모/대표 수정
 *   DELETE /:siteId/:folderId/documents/:id  — 자료 삭제
 */

const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');

const UPLOADS_DIR  = path.join(__dirname, '../../uploads/documents');
const MAX_BYTES    = 1 * 1024 * 1024 * 1024; // 1 GB
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── 지원 파일형식 ────────────────────────────────────────────────────────────
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/haansofthwp', 'application/x-hwp',
  'application/vnd.hancom.hwp', 'application/vnd.hancom.hwpx',
]);

function detectFileType(mime, originalname = '') {
  const ext = path.extname(originalname).toLowerCase().replace('.', '');
  if (['hwp', 'hwpx'].includes(ext)) return ext;
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/msword' || ext === 'doc') return 'doc';
  if (mime?.includes('wordprocessingml') || ext === 'docx') return 'docx';
  if (mime?.startsWith('image/')) return ext || 'jpg';
  return ext || 'file';
}

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
      `SELECT f.*, COUNT(d.id)::INT AS doc_count
       FROM document_folders f
       LEFT JOIN documents d ON d.folder_id = f.id
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
      `INSERT INTO document_folders (site_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *`,
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

    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ success: false, message: 'orders 배열 필요' });

    for (const { id, sort_order } of orders) {
      await db.query(
        `UPDATE document_folders SET sort_order = $1 WHERE id = $2 AND site_id = $3`,
        [sort_order, id, siteId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('reorderFolders error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── GET /:siteId/usage — 용량 현황 ─────────────────────────────────────────
exports.getUsage = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(file_size), 0)::BIGINT AS used_bytes FROM documents WHERE site_id = $1`,
      [siteId]
    );
    const usedBytes = Number(rows[0].used_bytes);
    res.json({
      success:    true,
      used_bytes: usedBytes,
      max_bytes:  MAX_BYTES,
      used_mb:    Math.round(usedBytes / 1024 / 1024),
      max_mb:     1024,
    });
  } catch (err) {
    console.error('getUsage error:', err);
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
      `UPDATE document_folders SET name = $1 WHERE id = $2 AND site_id = $3 RETURNING *`,
      [name.trim(), folderId, siteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '폴더 없음' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updateFolder error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── DELETE /:siteId/:folderId — 폴더 + 소속 자료 삭제 ───────────────────────
exports.deleteFolder = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { rows: docRows } = await db.query(
      `SELECT filename FROM documents WHERE folder_id = $1 AND site_id = $2`,
      [folderId, siteId]
    );
    for (const { filename } of docRows) {
      if (!filename) continue;
      const fp = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await db.query(`DELETE FROM documents WHERE folder_id = $1 AND site_id = $2`, [folderId, siteId]);
    await db.query(`DELETE FROM document_folders WHERE id = $1 AND site_id = $2`, [folderId, siteId]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteFolder error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── GET /:siteId/:folderId/documents — 자료 목록 ────────────────────────────
exports.listDocuments = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    const { rows } = await db.query(
      `SELECT * FROM documents WHERE site_id = $1 AND folder_id = $2 ORDER BY created_at ASC`,
      [siteId, folderId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listDocuments error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── POST /:siteId/:folderId/documents — 자료 업로드 ─────────────────────────
exports.uploadDocument = async (req, res) => {
  try {
    const siteId   = Number(req.params.siteId);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '파일 없음' });

    // 1GB 용량 검증
    const { rows: usageRows } = await db.query(
      `SELECT COALESCE(SUM(file_size), 0)::BIGINT AS total FROM documents WHERE site_id = $1`,
      [siteId]
    );
    if (Number(usageRows[0].total) + file.size > MAX_BYTES) {
      fs.unlinkSync(path.join(UPLOADS_DIR, file.filename));
      return res.status(400).json({
        success: false,
        message: '1GB 용량 초과. 유료 플랜을 이용해주세요.',
        limitExceeded: true,
      });
    }

    const fileType = detectFileType(file.mimetype, file.originalname);
    const title    = req.body.title?.trim() || file.originalname;
    const fileUrl  = `/uploads/documents/${file.filename}`;

    const { rows } = await db.query(
      `INSERT INTO documents
         (site_id, folder_id, title, file_url, filename, original_name, file_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [siteId, folderId, title, fileUrl, file.filename, file.originalname, fileType, file.size, req.user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('uploadDocument error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── PATCH /:siteId/:folderId/documents/:id — 메모/대표 수정 ─────────────────
exports.updateDocument = async (req, res) => {
  try {
    const siteId  = Number(req.params.siteId);
    const docId   = Number(req.params.id);
    const folderId = Number(req.params.folderId);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { memo, is_representative, title, is_public } = req.body;
    const updates = [];
    const vals    = [];

    if (memo         !== undefined) { updates.push(`memo = $${vals.length + 1}`);         vals.push(memo); }
    if (title        !== undefined) { updates.push(`title = $${vals.length + 1}`);        vals.push(title); }
    if (is_public    !== undefined) { updates.push(`is_public = $${vals.length + 1}`);    vals.push(is_public); }
    if (is_representative !== undefined) {
      if (is_representative) {
        await db.query(
          `UPDATE documents SET is_representative = FALSE WHERE folder_id = $1 AND site_id = $2`,
          [folderId, siteId]
        );
      }
      updates.push(`is_representative = $${vals.length + 1}`);
      vals.push(is_representative);
    }

    if (!updates.length) return res.status(400).json({ success: false, message: '변경 항목 없음' });

    vals.push(docId, siteId);
    const { rows } = await db.query(
      `UPDATE documents SET ${updates.join(', ')}
       WHERE id = $${vals.length - 1} AND site_id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '자료 없음' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updateDocument error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// ─── DELETE /:siteId/:folderId/documents/:id — 자료 삭제 ─────────────────────
exports.deleteDocument = async (req, res) => {
  try {
    const siteId = Number(req.params.siteId);
    const docId  = Number(req.params.id);
    if (!(await verifySite(siteId, req.user.id))) return res.status(403).json({ success: false, message: '권한 없음' });

    const { rows } = await db.query(
      `DELETE FROM documents WHERE id = $1 AND site_id = $2 RETURNING filename`,
      [docId, siteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '자료 없음' });

    if (rows[0].filename) {
      const fp = path.join(UPLOADS_DIR, rows[0].filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('deleteDocument error:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};
