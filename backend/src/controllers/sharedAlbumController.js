'use strict';

/**
 * sharedAlbumController.js — §8-G 공유앨범
 *
 * - 사이트당 앨범 1개 (auto-create on first access)
 * - dhash 중복 감지 (hamming distance ≤ 5 = 중복)
 * - 비로그인 업로드: 링크 토큰 경유 시 가능
 * - 관장 = family_sites.user_id
 */

const db     = require('../config/db');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const sharp  = require('sharp');

// ── dhash 계산 (sharp 활용) ───────────────────────────────────────────────────
async function computeDhash(filepath) {
  try {
    const { data } = await sharp(filepath)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let bits = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const idx = row * 9 + col;
        bits += data[idx] > data[idx + 1] ? '1' : '0';
      }
    }
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

function hammingDistance(h1, h2) {
  if (!h1 || !h2 || h1.length !== h2.length) return 64;
  let diff = 0;
  for (let i = 0; i < h1.length; i++) {
    let xor = parseInt(h1[i], 16) ^ parseInt(h2[i], 16);
    while (xor) { diff += xor & 1; xor >>= 1; }
  }
  return diff;
}

// ── 앨범 auto-create 헬퍼 ────────────────────────────────────────────────────
async function getOrCreateAlbum(siteId) {
  const { rows } = await db.query(
    'SELECT * FROM shared_albums WHERE site_id = $1 LIMIT 1',
    [siteId]
  );
  if (rows.length) return rows[0];
  const { rows: created } = await db.query(
    `INSERT INTO shared_albums (site_id, visibility, allow_download)
     VALUES ($1, 'family', true) RETURNING *`,
    [siteId]
  );
  return created[0];
}

// ── 관장 여부 확인 ────────────────────────────────────────────────────────────
async function isCurator(siteId, userId) {
  if (!userId) return false;
  const { rows } = await db.query(
    'SELECT 1 FROM family_sites WHERE id = $1 AND user_id = $2 LIMIT 1',
    [siteId, userId]
  );
  return rows.length > 0;
}

// ── GET /api/shared-album/:siteId ─────────────────────────────────────────────
exports.getAlbum = async (req, res) => {
  const { siteId } = req.params;
  try {
    const album = await getOrCreateAlbum(siteId);
    const { rows: photos } = await db.query(
      `SELECT id, uploader_id, uploader_name, file_url, uploaded_at
       FROM shared_album_photos
       WHERE album_id = $1
       ORDER BY uploaded_at DESC`,
      [album.id]
    );
    res.json({
      success: true,
      album: {
        id:            album.id,
        visibility:    album.visibility,
        allow_download: album.allow_download,
        share_token:   album.share_token,
      },
      photos,
    });
  } catch (err) {
    console.error('getAlbum error:', err);
    res.status(500).json({ success: false, message: '앨범 조회 실패' });
  }
};

// ── POST /api/shared-album/:siteId/photos ─────────────────────────────────────
exports.uploadPhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '파일이 없습니다.' });

  const { siteId }      = req.params;
  const uploaderId      = req.user?.id   || null;
  const uploaderName    = req.user?.name || req.body.uploader_name || '익명';

  try {
    const album = await getOrCreateAlbum(siteId);
    const filePath = req.file.path;

    // dhash 계산 + 중복 검사
    const dhash = await computeDhash(filePath);
    if (dhash) {
      const { rows: existing } = await db.query(
        'SELECT dhash FROM shared_album_photos WHERE album_id = $1 AND dhash IS NOT NULL',
        [album.id]
      );
      for (const row of existing) {
        if (hammingDistance(dhash, row.dhash) <= 5) {
          fs.unlinkSync(filePath);
          return res.status(409).json({
            success: false,
            message: '이미 같은 사진이 있습니다.',
            code:    'DUPLICATE',
          });
        }
      }
    }

    const fileUrl = `/uploads/shared-albums/${req.file.filename}`;
    const { rows } = await db.query(
      `INSERT INTO shared_album_photos (album_id, uploader_id, uploader_name, file_url, dhash)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [album.id, uploaderId, uploaderName, fileUrl, dhash]
    );
    res.json({ success: true, photo: rows[0] });
  } catch (err) {
    console.error('uploadPhoto error:', err);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: '업로드 실패' });
  }
};

// ── DELETE /api/shared-album/:siteId/photos/:id ───────────────────────────────
exports.deletePhoto = async (req, res) => {
  const { siteId, id } = req.params;
  const userId = req.user?.id;

  try {
    // 삭제 권한: 본인 또는 관장
    const curator = await isCurator(siteId, userId);
    const { rows } = await db.query(
      `SELECT sap.*, sa.site_id
       FROM shared_album_photos sap
       JOIN shared_albums sa ON sa.id = sap.album_id
       WHERE sap.id = $1 AND sa.site_id = $2`,
      [id, siteId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '사진 없음' });

    const photo = rows[0];
    if (!curator && photo.uploader_id !== userId) {
      return res.status(403).json({ success: false, message: '삭제 권한 없음' });
    }

    await db.query('DELETE FROM shared_album_photos WHERE id = $1', [id]);

    // 파일 삭제
    const filename = path.basename(photo.file_url);
    const full = path.join(__dirname, '../../uploads/shared-albums', filename);
    if (fs.existsSync(full)) fs.unlinkSync(full);

    res.json({ success: true });
  } catch (err) {
    console.error('deletePhoto error:', err);
    res.status(500).json({ success: false, message: '삭제 실패' });
  }
};

// ── PATCH /api/shared-album/:siteId/settings ─────────────────────────────────
exports.updateSettings = async (req, res) => {
  const { siteId } = req.params;
  const { visibility, allow_download } = req.body;
  const userId = req.user?.id;

  if (!(await isCurator(siteId, userId))) {
    return res.status(403).json({ success: false, message: '관장만 설정 변경 가능합니다.' });
  }

  const VALID_VIS = ['public', 'family', 'link'];
  if (visibility && !VALID_VIS.includes(visibility)) {
    return res.status(400).json({ success: false, message: '잘못된 공개범위' });
  }

  try {
    const album = await getOrCreateAlbum(siteId);
    const { rows } = await db.query(
      `UPDATE shared_albums
       SET visibility    = COALESCE($1, visibility),
           allow_download = COALESCE($2, allow_download)
       WHERE id = $3 RETURNING *`,
      [visibility || null, allow_download !== undefined ? allow_download : null, album.id]
    );
    res.json({ success: true, album: rows[0] });
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ success: false, message: '설정 변경 실패' });
  }
};

// ── POST /api/shared-album/:siteId/share-link ─────────────────────────────────
exports.createShareLink = async (req, res) => {
  const { siteId } = req.params;
  if (!(await isCurator(siteId, req.user?.id))) {
    return res.status(403).json({ success: false, message: '관장만 링크 생성 가능합니다.' });
  }

  try {
    const album = await getOrCreateAlbum(siteId);
    const token = crypto.randomBytes(24).toString('hex');
    const { rows } = await db.query(
      'UPDATE shared_albums SET share_token = $1 WHERE id = $2 RETURNING share_token',
      [token, album.id]
    );
    res.json({ success: true, share_token: rows[0].share_token });
  } catch (err) {
    console.error('createShareLink error:', err);
    res.status(500).json({ success: false, message: '링크 생성 실패' });
  }
};

// ── DELETE /api/shared-album/:siteId/share-link ───────────────────────────────
exports.revokeShareLink = async (req, res) => {
  const { siteId } = req.params;
  if (!(await isCurator(siteId, req.user?.id))) {
    return res.status(403).json({ success: false, message: '관장만 링크 무효화 가능합니다.' });
  }

  try {
    const album = await getOrCreateAlbum(siteId);
    await db.query('UPDATE shared_albums SET share_token = NULL WHERE id = $1', [album.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('revokeShareLink error:', err);
    res.status(500).json({ success: false, message: '링크 무효화 실패' });
  }
};

// ── GET /api/shared-album/link/:token ─────────────────────────────────────────
exports.getByToken = async (req, res) => {
  const { token } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT sa.*, fs.subdomain
       FROM shared_albums sa
       JOIN family_sites fs ON fs.id = sa.site_id
       WHERE sa.share_token = $1 LIMIT 1`,
      [token]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '유효하지 않은 링크입니다.' });

    const album = rows[0];
    const { rows: photos } = await db.query(
      `SELECT id, uploader_id, uploader_name, file_url, uploaded_at
       FROM shared_album_photos WHERE album_id = $1 ORDER BY uploaded_at DESC`,
      [album.id]
    );
    res.json({
      success: true,
      album: { id: album.id, visibility: album.visibility, allow_download: album.allow_download },
      subdomain: album.subdomain,
      photos,
    });
  } catch (err) {
    console.error('getByToken error:', err);
    res.status(500).json({ success: false, message: '앨범 조회 실패' });
  }
};

// ── POST /api/shared-album/link/:token/photos ─────────────────────────────────
exports.uploadByToken = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '파일이 없습니다.' });
  const { token } = req.params;

  try {
    const { rows: albumRows } = await db.query(
      'SELECT * FROM shared_albums WHERE share_token = $1 LIMIT 1',
      [token]
    );
    if (!albumRows.length) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: '유효하지 않은 링크입니다.' });
    }

    const album       = albumRows[0];
    const uploaderName = req.user?.name || req.body.uploader_name || '링크 업로더';
    const uploaderId  = req.user?.id || null;
    const filePath    = req.file.path;

    const dhash = await computeDhash(filePath);
    if (dhash) {
      const { rows: existing } = await db.query(
        'SELECT dhash FROM shared_album_photos WHERE album_id = $1 AND dhash IS NOT NULL',
        [album.id]
      );
      for (const row of existing) {
        if (hammingDistance(dhash, row.dhash) <= 5) {
          fs.unlinkSync(filePath);
          return res.status(409).json({ success: false, message: '이미 같은 사진이 있습니다.', code: 'DUPLICATE' });
        }
      }
    }

    const fileUrl = `/uploads/shared-albums/${req.file.filename}`;
    const { rows } = await db.query(
      `INSERT INTO shared_album_photos (album_id, uploader_id, uploader_name, file_url, dhash)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [album.id, uploaderId, uploaderName, fileUrl, dhash]
    );
    res.json({ success: true, photo: rows[0] });
  } catch (err) {
    console.error('uploadByToken error:', err);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: '업로드 실패' });
  }
};
