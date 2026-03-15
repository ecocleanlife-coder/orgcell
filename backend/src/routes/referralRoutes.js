const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ──────────────────────────────────────────────
// POST /api/referral/apply
// Body: { code: "KSA-XXXXXX", email: "user@example.com" }
// 추천 코드 검증 → 유효하면 해당 이메일에 1년 무료 구독 부여
// ──────────────────────────────────────────────
router.post('/apply', async (req, res) => {
    const { code, email } = req.body;

    if (!code || !email) {
        return res.status(400).json({ success: false, message: '코드와 이메일을 모두 입력해 주세요.' });
    }

    const codeStr = code.trim().toUpperCase();
    const emailStr = email.trim().toLowerCase();

    // KSA-XXXXXX 형식 검사
    if (!/^KSA-[A-Z0-9]{4,10}$/.test(codeStr)) {
        return res.status(400).json({ success: false, message: '코드 형식이 올바르지 않습니다. (예: KSA-ABCD12)' });
    }

    try {
        // Auto-create tables if not present
        await db.query(`
            CREATE TABLE IF NOT EXISTS referral_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                created_by VARCHAR(255),
                used_by VARCHAR(255),
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                stripe_session_id VARCHAR(255) UNIQUE,
                amount_usd INTEGER,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 코드 조회
        const { rows } = await db.query(
            `SELECT id, code, used_by, used_at FROM referral_codes WHERE code = $1`,
            [codeStr]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: '유효하지 않은 추천 코드입니다.' });
        }

        const referral = rows[0];

        if (referral.used_by) {
            if (referral.used_by === emailStr) {
                return res.status(409).json({ success: false, message: '이미 이 코드를 사용하셨습니다.' });
            }
            return res.status(409).json({ success: false, message: '이미 사용된 추천 코드입니다.' });
        }

        // 이미 구독 중인지 확인
        const { rows: existingSubs } = await db.query(
            `SELECT id FROM subscriptions WHERE email = $1 AND status = 'active'`,
            [emailStr]
        );
        if (existingSubs.length > 0) {
            return res.status(409).json({ success: false, message: '이미 활성화된 구독이 있습니다.' });
        }

        // 코드 사용 처리
        await db.query(
            `UPDATE referral_codes SET used_by = $1, used_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [emailStr, referral.id]
        );

        // 1년 무료 구독 부여 (amount_usd = 0, session_id = referral_code)
        await db.query(
            `INSERT INTO subscriptions (email, stripe_session_id, amount_usd, status)
             VALUES ($1, $2, 0, 'active')
             ON CONFLICT (stripe_session_id) DO NOTHING`,
            [emailStr, `referral_${codeStr}_${Date.now()}`]
        );

        console.log(`[Referral] Code ${codeStr} applied for ${emailStr}`);
        res.json({
            success: true,
            message: '🎉 이용권이 확인되었습니다! 로그인 후 도메인을 생성해 보세요.',
        });
    } catch (err) {
        console.error('[Referral] Error:', err);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }
});

// ──────────────────────────────────────────────
// POST /api/referral/generate  (admin only — 코드 발급)
// Body: { codes: ["KSA-ABCD12", ...], created_by: "ksarang" }
// ──────────────────────────────────────────────
router.post('/generate', async (req, res) => {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { codes, created_by } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
        return res.status(400).json({ success: false, message: 'codes array required' });
    }

    try {
        let inserted = 0;
        for (const code of codes) {
            const c = code.trim().toUpperCase();
            if (!/^KSA-[A-Z0-9]{4,10}$/.test(c)) continue;
            await db.query(
                `INSERT INTO referral_codes (code, created_by) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [c, created_by || 'admin']
            );
            inserted++;
        }
        res.json({ success: true, inserted });
    } catch (err) {
        console.error('[Referral] Generate error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate codes' });
    }
});

module.exports = router;
