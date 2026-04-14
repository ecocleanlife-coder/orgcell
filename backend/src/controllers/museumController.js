const db = require('../config/db');

// GET /api/museum/search?q=name  (no auth — public persons only)
exports.searchMuseums = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({ success: true, data: [] });
        }
        const like = `%${q}%`;
        const { rows } = await db.query(
            `SELECT p.id, p.name, p.maiden_name, p.former_name, p.gender,
                    p.birth_date, p.death_date, p.is_deceased,
                    p.photo_url, p.oc_id,
                    fs.subdomain, fs.title AS museum_title, fs.id AS site_id
             FROM persons p
             JOIN family_sites fs ON fs.id = p.site_id
             WHERE fs.status = 'public'
               AND p.privacy_level = 'public'
               AND (
                 p.name ILIKE $1
                 OR p.maiden_name ILIKE $1
                 OR p.former_name ILIKE $1
                 OR p.oc_id ILIKE $1
               )
             ORDER BY p.name
             LIMIT 20`,
            [like]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('searchMuseums error:', err);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};

// GET /api/museum/mine  (protect)
// 로그인 유저가 소유하거나 멤버인 박물관 목록 반환
exports.getMyMuseums = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rows } = await db.query(
            `SELECT fs.id, fs.user_id, fs.subdomain, fs.theme, fs.status, fs.created_at,
                    COALESCE(fs.title, fs.subdomain) AS title,
                    fs.description, fs.thumbnail_url,
                    CASE WHEN fs.user_id = $1 THEN 'owner' ELSE 'member' END AS role,
                    CASE WHEN fs.status = 'public' THEN 'public' ELSE 'family' END AS type
             FROM family_sites fs
             WHERE fs.user_id = $1
             UNION
             SELECT fs.id, fs.user_id, fs.subdomain, fs.theme, fs.status, fs.created_at,
                    COALESCE(fs.title, fs.subdomain) AS title,
                    fs.description, fs.thumbnail_url,
                    'member' AS role,
                    CASE WHEN fs.status = 'public' THEN 'public' ELSE 'family' END AS type
             FROM family_sites fs
             JOIN site_members sm ON sm.site_id = fs.id
             WHERE sm.user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('getMyMuseums error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/museum/:subdomain  (optionalAuth)
// Returns site info + curator name + caller's role: 'public' | 'member' | 'owner'
exports.getMuseumBySubdomain = async (req, res) => {
    try {
        const subdomain = req.params.subdomain.toLowerCase();
        const { rows } = await db.query(
            `SELECT fs.id, fs.user_id, fs.subdomain, fs.theme, fs.status, fs.created_at,
                    p.name AS curator_name
             FROM family_sites fs
             LEFT JOIN persons p
               ON p.site_id = fs.id
              AND p.user_id = fs.user_id
              AND p.match_status = 'linked'
             WHERE LOWER(fs.subdomain) = $1
             LIMIT 1`,
            [subdomain]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Museum not found' });

        const site = rows[0];
        let role = 'public';

        if (req.user) {
            if (req.user.id === site.user_id) {
                role = 'owner';
            } else {
                const { rows: mem } = await db.query(
                    'SELECT id FROM site_members WHERE site_id = $1 AND user_id = $2',
                    [site.id, req.user.id]
                );
                if (mem.length) role = 'member';
            }
        }

        res.json({ success: true, data: { ...site, role } });
    } catch (err) {
        console.error('getMuseumBySubdomain error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


// PATCH /api/museum/:subdomain/tree-public — 가계도 타인 공개 여부 토글 (관장 전용)
exports.setTreePublic = async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { tree_public } = req.body;
    if (typeof tree_public !== 'boolean') {
      return res.status(400).json({ success: false, message: 'tree_public must be boolean' });
    }
    const { rows } = await db.query(
      `UPDATE family_sites SET tree_public = $1
       WHERE LOWER(subdomain) = $2 AND user_id = $3
       RETURNING id, subdomain, tree_public`,
      [tree_public, subdomain.toLowerCase(), req.user.id]
    );
    if (!rows.length) return res.status(403).json({ success: false, message: '권한 없음' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('setTreePublic error:', err);
    res.status(500).json({ success: false, message: '설정 변경 실패' });
  }
};

// POST /api/museum/open — 가상 박물관 개설 (미개설 인물이 본인 박물관 개설)
exports.openMuseum = async (req, res) => {
  try {
    const { personDbId, email, siteId } = req.body;
    if (!personDbId || !email) {
      return res.status(400).json({ success: false, message: 'personDbId, email 필수' });
    }

    // 인물 조회
    const { rows: personRows } = await db.query(
      `SELECT * FROM persons WHERE id = $1`, [personDbId]
    );
    if (!personRows.length) return res.status(404).json({ success: false, message: '인물 없음' });
    const person = personRows[0];

    // 이메일로 기존 유저 확인 또는 신규 생성 (magic link 방식)
    let userId = req.user?.id;
    if (!userId) {
      const { rows: userRows } = await db.query(
        `SELECT id FROM users WHERE LOWER(email) = $1`, [email.toLowerCase()]
      );
      userId = userRows[0]?.id;
    }

    if (!userId) {
      // 신규 유저 생성 (임시 — magic link로 인증 필요)
      const { rows: newUser } = await db.query(
        `INSERT INTO users (email, created_at) VALUES ($1, NOW()) RETURNING id`,
        [email.toLowerCase()]
      );
      userId = newUser[0].id;
    }

    // 사이트 소유자의 subdomain을 기반으로 새 subdomain 생성 (§26-1-1)
    const baseDomain = person.last_name
      ? `${person.last_name.toLowerCase().replace(/[^a-z]/g, '')}-1`
      : `person-${personDbId}`;
    // 중복 방지
    let subdomain = baseDomain;
    let suffix = 1;
    while (true) {
      const { rows: exist } = await db.query(
        `SELECT 1 FROM family_sites WHERE LOWER(subdomain) = $1`, [subdomain]
      );
      if (!exist.length) break;
      suffix++;
      subdomain = `${baseDomain.replace(/-\d+$/, '')}-${suffix}`;
    }

    // family_sites 생성
    const { rows: siteRows } = await db.query(
      `INSERT INTO family_sites (user_id, subdomain, title, status, tree_public, created_at)
       VALUES ($1, $2, $3, 'active', TRUE, NOW())
       RETURNING id, subdomain`,
      [userId, subdomain, `${person.name} 가족유산박물관`]
    );
    const newSite = siteRows[0];

    // 인물 match_status → linked, user_id 연결
    await db.query(
      `UPDATE persons SET match_status = 'linked', user_id = $1 WHERE id = $2`,
      [userId, personDbId]
    );

    // magic link 발송 (이메일 인증)
    try {
      const { sendMagicLink } = require('../services/emailService');
      await sendMagicLink(email, `/${subdomain}`);
    } catch (_) {}

    res.json({ success: true, subdomain: newSite.subdomain, message: '박물관이 개설되었습니다.' });
  } catch (err) {
    console.error('openMuseum error:', err);
    res.status(500).json({ success: false, message: '박물관 개설 실패: ' + err.message });
  }
};
