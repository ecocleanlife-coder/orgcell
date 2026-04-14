/**
 * autobiographyController.js — §8-D 자서전 CRUD + 파일 업로드/텍스트 추출
 *
 * 지원 형식:
 *   txt / doc / docx  → 텍스트 추출 후 챕터 자동 생성
 *   hwp / hwpx         → 원본 보관 + 다운로드 전용
 *   pdf                → 텍스트 추출 시도, 실패 시 원본 보관
 */

const path    = require('path');
const fs      = require('fs');
const pool    = require('../config/db');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/autobiography');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── 소유 검증 ─────────────────────────────────────────────────────────────────
async function verifySite(siteId, userId) {
  const r = await pool.query(
    `SELECT id FROM family_sites WHERE id=$1 AND user_id=$2 AND status='active'`,
    [siteId, userId]
  );
  return r.rowCount > 0;
}

// ── GET /:siteId — 챕터 목록 ──────────────────────────────────────────────────
async function listChapters(req, res) {
  try {
    const { siteId } = req.params;
    const userId     = req.user?.id ?? null;
    const isCurator  = userId ? await verifySite(siteId, userId) : false;
    const wherePublic = isCurator ? '' : 'AND is_public = true';

    const { rows } = await pool.query(
      `SELECT id, person_id, title, content, sort_order, is_public, created_at, updated_at
       FROM autobiography_chapters
       WHERE site_id = $1 ${wherePublic}
       ORDER BY sort_order ASC, id ASC`,
      [siteId]
    );

    // 원본 파일 목록 (관장에게만)
    let files = [];
    if (isCurator) {
      const fr = await pool.query(
        `SELECT id, person_id, file_url, file_type, file_name, is_extracted, created_at
         FROM autobiography_files WHERE site_id=$1 ORDER BY id DESC`,
        [siteId]
      );
      files = fr.rows;
    }

    res.json({ chapters: rows, files });
  } catch (err) {
    console.error('autobiography listChapters:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── POST /:siteId/chapters — 챕터 추가 ───────────────────────────────────────
async function createChapter(req, res) {
  try {
    const { siteId }                              = req.params;
    const { person_id, title, content, is_public } = req.body;

    if (!await verifySite(siteId, req.user.id)) return res.status(403).json({ message: '권한 없음' });
    if (!title?.trim()) return res.status(400).json({ message: '챕터 제목은 필수입니다' });

    const { rows: maxR } = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS m FROM autobiography_chapters WHERE site_id=$1`,
      [siteId]
    );
    const sortOrder = maxR[0].m + 1;

    const { rows } = await pool.query(
      `INSERT INTO autobiography_chapters (site_id, person_id, title, content, sort_order, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, person_id, title, content, sort_order, is_public, created_at, updated_at`,
      [siteId, person_id ?? 0, title.trim(), content ?? '', sortOrder, is_public ?? false]
    );

    res.status(201).json({ chapter: rows[0] });
  } catch (err) {
    console.error('autobiography createChapter:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── PUT /:siteId/chapters/reorder — 순서 저장 ────────────────────────────────
async function reorderChapters(req, res) {
  try {
    const { siteId }    = req.params;
    const { orderedIds } = req.body;

    if (!await verifySite(siteId, req.user.id)) return res.status(403).json({ message: '권한 없음' });
    if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds 배열 필요' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          `UPDATE autobiography_chapters SET sort_order=$1, updated_at=NOW() WHERE id=$2 AND site_id=$3`,
          [i, orderedIds[i], siteId]
        );
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }

    res.json({ ok: true });
  } catch (err) {
    console.error('autobiography reorderChapters:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── PUT /:siteId/chapters/:id — 챕터 수정 ────────────────────────────────────
async function updateChapter(req, res) {
  try {
    const { siteId, id }                    = req.params;
    const { title, content, is_public }      = req.body;

    if (!await verifySite(siteId, req.user.id)) return res.status(403).json({ message: '권한 없음' });

    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (title     !== undefined) { fields.push(`title=$${idx++}`);     vals.push(title); }
    if (content   !== undefined) { fields.push(`content=$${idx++}`);   vals.push(content); }
    if (is_public !== undefined) { fields.push(`is_public=$${idx++}`); vals.push(is_public); }

    if (!fields.length) return res.status(400).json({ message: '변경 필드 없음' });
    fields.push(`updated_at=NOW()`);
    vals.push(siteId, id);

    const { rows } = await pool.query(
      `UPDATE autobiography_chapters SET ${fields.join(', ')}
       WHERE site_id=$${idx++} AND id=$${idx}
       RETURNING id, person_id, title, content, sort_order, is_public, updated_at`,
      vals
    );

    if (!rows.length) return res.status(404).json({ message: '챕터 없음' });
    res.json({ chapter: rows[0] });
  } catch (err) {
    console.error('autobiography updateChapter:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── DELETE /:siteId/chapters/:id — 챕터 삭제 ─────────────────────────────────
async function deleteChapter(req, res) {
  try {
    const { siteId, id } = req.params;
    if (!await verifySite(siteId, req.user.id)) return res.status(403).json({ message: '권한 없음' });

    const { rowCount } = await pool.query(
      `DELETE FROM autobiography_chapters WHERE id=$1 AND site_id=$2`,
      [id, siteId]
    );
    if (!rowCount) return res.status(404).json({ message: '챕터 없음' });
    res.json({ ok: true });
  } catch (err) {
    console.error('autobiography deleteChapter:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── POST /:siteId/upload — 파일 업로드 + 텍스트 추출 ─────────────────────────
async function uploadFile(req, res) {
  try {
    const { siteId }  = req.params;
    const { person_id } = req.body;

    if (!await verifySite(siteId, req.user.id)) return res.status(403).json({ message: '권한 없음' });
    if (!req.file) return res.status(400).json({ message: '파일이 없습니다' });

    const { originalname, filename, mimetype, path: filePath } = req.file;
    const ext      = path.extname(originalname).toLowerCase().replace('.', '');
    const fileUrl  = `/uploads/autobiography/${filename}`;
    const baseName = path.basename(originalname, path.extname(originalname));

    let extractedText = null;
    let isExtracted   = false;
    let hwpWarning    = false;

    // 텍스트 추출
    if (ext === 'txt') {
      extractedText = fs.readFileSync(filePath, 'utf8');
      isExtracted   = true;
    } else if (ext === 'doc' || ext === 'docx') {
      try {
        const mammoth = require('mammoth');
        const result  = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
        isExtracted   = true;
      } catch (e) {
        console.error('mammoth extract error:', e.message);
      }
    } else if (ext === 'pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const buf      = fs.readFileSync(filePath);
        const data     = await pdfParse(buf);
        extractedText  = data.text;
        isExtracted    = true;
      } catch (e) {
        console.error('pdf-parse extract error:', e.message);
        // 실패 시 원본 보관 (isExtracted=false)
      }
    } else if (ext === 'hwp' || ext === 'hwpx') {
      hwpWarning = true;
    }

    // autobiography_files 저장
    const { rows: fileRows } = await pool.query(
      `INSERT INTO autobiography_files (site_id, person_id, file_url, file_type, file_name, is_extracted)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [siteId, person_id ?? 0, fileUrl, ext, originalname, isExtracted]
    );
    const fileId = fileRows[0].id;

    // 추출 성공 시 챕터 자동 생성
    let chapter = null;
    if (isExtracted && extractedText) {
      const htmlContent = `<p>${extractedText.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
      const { rows: maxR } = await pool.query(
        `SELECT COALESCE(MAX(sort_order), -1) AS m FROM autobiography_chapters WHERE site_id=$1`,
        [siteId]
      );
      const sortOrder = maxR[0].m + 1;
      const { rows: chR } = await pool.query(
        `INSERT INTO autobiography_chapters (site_id, person_id, title, content, sort_order, is_public)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id, person_id, title, content, sort_order, is_public, created_at, updated_at`,
        [siteId, person_id ?? 0, baseName, htmlContent, sortOrder]
      );
      chapter = chR[0];
    }

    res.json({
      ok:         true,
      fileId,
      fileUrl,
      isExtracted,
      hwpWarning,
      chapter,
      message: hwpWarning
        ? 'HWP 파일은 다운로드만 가능합니다. 편집을 원하시면 docx로 변환 후 업로드해주세요.'
        : isExtracted
          ? `텍스트를 추출하여 챕터를 생성했습니다.`
          : 'PDF 텍스트 추출에 실패했습니다. 원본 파일을 보관합니다.',
    });
  } catch (err) {
    console.error('autobiography uploadFile:', err);
    res.status(500).json({ message: '업로드 실패' });
  }
}

module.exports = { listChapters, createChapter, reorderChapters, updateChapter, deleteChapter, uploadFile };
