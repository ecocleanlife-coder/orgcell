// subdomainController.js
// §26-1-1 Subdomain 자동배정 API 컨트롤러

const { assignSubdomain, confirmBonGwan, getBonGwanList } = require('../services/subdomainAssigner');

/**
 * POST /api/subdomain/assign
 * 온보딩 시 subdomain 자동배정
 * body: { surnameKo, bonGwanKo?, surnameEn?, nationality? }
 */
async function assign(req, res) {
    try {
        const { surnameKo, bonGwanKo, surnameEn, nationality } = req.body;

        if (!surnameKo && !surnameEn) {
            return res.status(400).json({ success: false, message: '성씨(surnameKo 또는 surnameEn)는 필수입니다.' });
        }
        if (surnameKo && (typeof surnameKo !== 'string' || surnameKo.trim().length > 10)) {
            return res.status(400).json({ success: false, message: 'surnameKo는 10자 이내 문자열이어야 합니다.' });
        }
        if (bonGwanKo && (typeof bonGwanKo !== 'string' || bonGwanKo.trim().length > 30)) {
            return res.status(400).json({ success: false, message: 'bonGwanKo는 30자 이내 문자열이어야 합니다.' });
        }
        if (surnameEn && (typeof surnameEn !== 'string' || !/^[A-Za-z]{1,30}$/.test(surnameEn.trim()))) {
            return res.status(400).json({ success: false, message: 'surnameEn은 영문 1~30자이어야 합니다.' });
        }

        const subdomain = await assignSubdomain({
            surnameKo: surnameKo?.trim(),
            bonGwanKo: bonGwanKo?.trim() || null,
            surnameEn: surnameEn?.trim() || null,
            nationality,
        });
        res.json({ success: true, subdomain });
    } catch (err) {
        console.error('[subdomain] assign error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * PUT /api/subdomain/confirm-bon-gwan
 * 본관 미확정 → 확정 전환 (LEE-1 → LEE006-M)
 * 인증 필요 (본인 사이트만)
 * body: { surnameKo, bonGwanKo }
 */
async function confirmBonGwanHandler(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: '인증 필요' });

        const { surnameKo, bonGwanKo } = req.body;
        if (!surnameKo || !bonGwanKo) {
            return res.status(400).json({ success: false, message: 'surnameKo, bonGwanKo 필수' });
        }
        if (typeof surnameKo !== 'string' || surnameKo.trim().length > 10) {
            return res.status(400).json({ success: false, message: 'surnameKo는 10자 이내 문자열이어야 합니다.' });
        }
        if (typeof bonGwanKo !== 'string' || bonGwanKo.trim().length > 30) {
            return res.status(400).json({ success: false, message: 'bonGwanKo는 30자 이내 문자열이어야 합니다.' });
        }

        // 본인 사이트 확인
        const db = require('../config/db');
        const siteRes = await db.query(
            'SELECT id FROM family_sites WHERE user_id = $1',
            [userId]
        );
        if (siteRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: '박물관을 찾을 수 없습니다.' });
        }
        const siteId = siteRes.rows[0].id;

        const result = await confirmBonGwan(siteId, surnameKo, bonGwanKo);
        res.json({
            success: true,
            oldSubdomain: result.oldSubdomain,
            newSubdomain: result.newSubdomain,
            message: `박물관 주소가 ${result.oldSubdomain}에서 ${result.newSubdomain}으로 변경되었습니다.`,
        });
    } catch (err) {
        console.error('[subdomain] confirm-bon-gwan error:', err);
        const status = err.message.includes('이미 확정') ? 409 : 500;
        res.status(status).json({ success: false, message: err.message });
    }
}

/**
 * GET /api/subdomain/bon-gwan?surnameKo=이
 * 성씨별 본관 목록 조회 (온보딩 자동완성용)
 */
async function getBonGwanListHandler(req, res) {
    try {
        const { surnameKo } = req.query;
        if (!surnameKo) {
            return res.status(400).json({ success: false, message: 'surnameKo 파라미터 필요' });
        }
        const list = await getBonGwanList(surnameKo);
        res.json({ success: true, bonGwanList: list });
    } catch (err) {
        console.error('[subdomain] getBonGwanList error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = { assign, confirmBonGwanHandler, getBonGwanListHandler };
