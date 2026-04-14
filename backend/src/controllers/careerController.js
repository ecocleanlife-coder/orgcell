/**
 * careerController.js — §8-C 주요약력 CRUD
 *
 * 권한 규칙:
 *   - GET: 관장(본인) → 전체, 방문자 → is_public=true 만
 *   - POST/PUT/DELETE: 해당 site_id 소유자 또는 person_id 본인(향후 확장)
 */

const pool = require('../config/db');

// ── 소유 검증 헬퍼 ──────────────────────────────────────────────────────────────
async function verifySite(siteId, userId) {
  const r = await pool.query(
    `SELECT id FROM family_sites WHERE id=$1 AND user_id=$2 AND status='active'`,
    [siteId, userId]
  );
  return r.rowCount > 0;
}

// ── GET /:siteId — 약력 목록 ────────────────────────────────────────────────────
async function listItems(req, res) {
  try {
    const { siteId } = req.params;
    const userId     = req.user?.id ?? null;

    // 관장 여부 확인
    const isCurator = userId ? await verifySite(siteId, userId) : false;

    const wherePublic = isCurator ? '' : 'AND is_public = true';
    const { rows } = await pool.query(
      `SELECT id, person_id, year, content, description, sort_order, is_public, created_at
       FROM career_items
       WHERE site_id = $1 ${wherePublic}
       ORDER BY sort_order ASC, year ASC, id ASC`,
      [siteId]
    );

    res.json({ items: rows });
  } catch (err) {
    console.error('career listItems:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── POST /:siteId — 항목 추가 ───────────────────────────────────────────────────
async function createItem(req, res) {
  try {
    const { siteId }                          = req.params;
    const { person_id, year, content, description, is_public } = req.body;

    if (!await verifySite(siteId, req.user.id)) {
      return res.status(403).json({ message: '권한 없음' });
    }
    if (!year || !content) {
      return res.status(400).json({ message: '연도와 내용은 필수입니다' });
    }

    // sort_order: 현재 최대값 + 1
    const { rows: maxR } = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS m FROM career_items WHERE site_id=$1`,
      [siteId]
    );
    const sortOrder = maxR[0].m + 1;

    const { rows } = await pool.query(
      `INSERT INTO career_items (site_id, person_id, year, content, description, sort_order, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, person_id, year, content, description, sort_order, is_public, created_at`,
      [siteId, person_id, year, content, description || null, sortOrder, is_public ?? false]
    );

    res.status(201).json({ item: rows[0] });
  } catch (err) {
    console.error('career createItem:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── PUT /:siteId/reorder — 순서 저장 ────────────────────────────────────────────
async function reorderItems(req, res) {
  try {
    const { siteId }    = req.params;
    const { orderedIds } = req.body; // [id, id, ...]

    if (!await verifySite(siteId, req.user.id)) {
      return res.status(403).json({ message: '권한 없음' });
    }
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds 배열 필요' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          `UPDATE career_items SET sort_order=$1, updated_at=NOW() WHERE id=$2 AND site_id=$3`,
          [i, orderedIds[i], siteId]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('career reorderItems:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── PUT /:siteId/:itemId — 항목 수정 ────────────────────────────────────────────
async function updateItem(req, res) {
  try {
    const { siteId, itemId }                  = req.params;
    const { year, content, description, is_public } = req.body;

    if (!await verifySite(siteId, req.user.id)) {
      return res.status(403).json({ message: '권한 없음' });
    }

    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (year        !== undefined) { fields.push(`year=$${idx++}`);        vals.push(year); }
    if (content     !== undefined) { fields.push(`content=$${idx++}`);     vals.push(content); }
    if (description !== undefined) { fields.push(`description=$${idx++}`); vals.push(description || null); }
    if (is_public   !== undefined) { fields.push(`is_public=$${idx++}`);   vals.push(is_public); }

    if (!fields.length) return res.status(400).json({ message: '변경 필드 없음' });

    fields.push(`updated_at=NOW()`);
    vals.push(siteId, itemId);

    const { rows } = await pool.query(
      `UPDATE career_items SET ${fields.join(', ')}
       WHERE site_id=$${idx++} AND id=$${idx}
       RETURNING id, person_id, year, content, description, sort_order, is_public`,
      vals
    );

    if (!rows.length) return res.status(404).json({ message: '항목 없음' });
    res.json({ item: rows[0] });
  } catch (err) {
    console.error('career updateItem:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

// ── DELETE /:siteId/:itemId — 항목 삭제 ─────────────────────────────────────────
async function deleteItem(req, res) {
  try {
    const { siteId, itemId } = req.params;

    if (!await verifySite(siteId, req.user.id)) {
      return res.status(403).json({ message: '권한 없음' });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM career_items WHERE id=$1 AND site_id=$2`,
      [itemId, siteId]
    );

    if (!rowCount) return res.status(404).json({ message: '항목 없음' });
    res.json({ ok: true });
  } catch (err) {
    console.error('career deleteItem:', err);
    res.status(500).json({ message: '서버 오류' });
  }
}

module.exports = { listItems, createItem, reorderItems, updateItem, deleteItem };
