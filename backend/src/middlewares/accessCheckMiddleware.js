'use strict';

/**
 * accessCheckMiddleware.js — §16 입장권 기반 API 접근 제어
 *
 * 검증 순서:
 *   1. 비로그인 → 401
 *   2. 관장 본인 (family_sites.user_id === req.user.id) → 통과
 *   3. Legacy Pass: persons.user_id 매칭 + match_status='linked' → 통과
 *   4. access_passes: is_active=true + (expires_at NULL 또는 미만료) → 통과
 *   5. 해당 없음 → 403
 *
 * req.params.subdomain 필수.
 * 통과 시 req.museumSite = { id, user_id, subdomain } 주입.
 */

const db = require('../config/db');

module.exports = async function accessCheckMiddleware(req, res, next) {
    const subdomain = (req.params.subdomain || '').toLowerCase();
    if (!subdomain) {
        return res.status(400).json({ success: false, message: 'subdomain 필요' });
    }

    // 1. 로그인 확인
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    try {
        // 사이트 조회
        const { rows: siteRows } = await db.query(
            `SELECT id, user_id FROM family_sites
             WHERE LOWER(subdomain) = $1 AND status = 'active'`,
            [subdomain]
        );
        if (!siteRows.length) {
            return res.status(404).json({ success: false, message: '박물관을 찾을 수 없습니다.' });
        }
        const site = siteRows[0];
        req.museumSite = { ...site, subdomain };

        // 2. 관장 본인
        if (userId === site.user_id) return next();

        // 3. Legacy Pass — linked 인물 계정
        const { rows: linkedRows } = await db.query(
            `SELECT id FROM persons
             WHERE site_id = $1 AND user_id = $2 AND match_status = 'linked'
             LIMIT 1`,
            [site.id, userId]
        );
        if (linkedRows.length > 0) return next();

        // 4. access_passes — 유효 입장권
        const { rows: passRows } = await db.query(
            `SELECT id FROM access_passes
             WHERE site_id = $1 AND user_id = $2
               AND is_active = TRUE
               AND (expires_at IS NULL OR expires_at > NOW())
             LIMIT 1`,
            [site.id, userId]
        );
        if (passRows.length > 0) return next();

        // 5. 미인가
        return res.status(403).json({
            success: false,
            message: '입장권이 없습니다. 관장에게 입장권을 요청하세요.',
            code: 'NO_PASS',
        });
    } catch (err) {
        console.error('[accessCheckMiddleware] error:', err);
        return res.status(500).json({ success: false, message: '접근 권한 확인 실패' });
    }
};
