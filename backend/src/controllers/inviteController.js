const db = require('../config/db');
const crypto = require('crypto');
const { sendInviteEmail } = require('../services/emailService');

// ── 헬퍼: 6자리 Short Code 생성 (숫자+대문자, 혼동 문자 제외) ──
function generateShortCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // O/0/1/I 제외
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

// ── 헬퍼: 이메일 정규화 (소문자 + trim + CRLF 제거) ──
function normalizeEmail(email) {
    return (email || '').replace(/[\r\n]/g, '').trim().toLowerCase();
}

// ════════════════════════════════════════
// POST /api/invite/create
// 초대 코드 생성 (hexCode + shortCode, 30일 만료)
// ════════════════════════════════════════
exports.createInvite = async (req, res) => {
    try {
        const { site_id, email } = req.body;
        if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });

        const code = crypto.randomBytes(5).toString('hex').toUpperCase();
        const shortCode = generateShortCode();
        const normalizedEmail = email ? normalizeEmail(email) : null;

        const { rows } = await db.query(
            `INSERT INTO family_invites (site_id, inviter_id, code, short_code, email, expires_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '30 days')
             RETURNING code, short_code, expires_at`,
            [site_id, req.user.id, code, shortCode, normalizedEmail]
        );

        const invite = rows[0];
        res.json({
            success: true,
            data: {
                code: invite.code,
                short_code: invite.short_code,
                expires_at: invite.expires_at,
                url: `https://orgcell.com/invite?code=${invite.code}`,
                short_url: `https://orgcell.com/invite?code=${invite.short_code}`,
            },
        });
    } catch (err) {
        console.error('createInvite error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// GET /api/invite/info?code=...
// 초대 정보 조회 (code 또는 short_code 모두 지원)
// 만료 시 410 Gone 응답
// ════════════════════════════════════════
exports.getInviteInfo = async (req, res) => {
    try {
        const rawCode = (req.query.code || '').trim().toUpperCase();
        if (!rawCode) return res.status(400).json({ success: false, message: 'code required' });

        // code 또는 short_code로 조회
        const { rows } = await db.query(
            `SELECT fi.code, fi.short_code, fi.site_id, fi.status, fi.expires_at,
                    fs.subdomain, u.name AS inviter_name
             FROM family_invites fi
             JOIN family_sites fs ON fs.id = fi.site_id
             LEFT JOIN users u ON u.id = fi.inviter_id
             WHERE (fi.code = $1 OR fi.short_code = $1)`,
            [rawCode]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: '존재하지 않는 초대 코드입니다' });
        }

        const invite = rows[0];

        // 만료 확인 → 410 Gone
        if (new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({
                success: false,
                message: '초대 링크가 만료되었습니다. 초대한 분에게 새 초대를 요청해주세요.',
                expired: true,
            });
        }

        if (invite.status === 'accepted') {
            return res.status(400).json({ success: false, message: '이미 수락된 초대입니다' });
        }

        res.json({ success: true, data: invite });
    } catch (err) {
        console.error('getInviteInfo error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// POST /api/invite/accept
// 초대 수락 (code 또는 short_code 지원, 만료 410)
// ════════════════════════════════════════
exports.acceptInvite = async (req, res) => {
    try {
        const rawCode = (req.body.code || '').trim().toUpperCase();
        if (!rawCode) return res.status(400).json({ success: false, message: 'code required' });

        const { rows } = await db.query(
            `SELECT fi.id, fi.site_id, fi.status, fi.expires_at, fs.subdomain
             FROM family_invites fi
             JOIN family_sites fs ON fs.id = fi.site_id
             WHERE (fi.code = $1 OR fi.short_code = $1)`,
            [rawCode]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: '존재하지 않는 초대 코드입니다' });
        }

        const invite = rows[0];

        // 만료 확인 → 410 Gone
        if (new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({
                success: false,
                message: '초대 링크가 만료되었습니다. 초대한 분에게 새 초대를 요청해주세요.',
                expired: true,
            });
        }

        if (invite.status === 'accepted') {
            return res.status(400).json({ success: false, message: '이미 수락된 초대입니다' });
        }

        const userId = req.user.id;

        // site_members에 추가
        await db.query(
            `INSERT INTO site_members (site_id, user_id, role)
             VALUES ($1, $2, 'member')
             ON CONFLICT (site_id, user_id) DO NOTHING`,
            [invite.site_id, userId]
        );

        // 초대 상태 변경
        await db.query(
            `UPDATE family_invites SET status = 'accepted' WHERE id = $1`,
            [invite.id]
        );

        // 방문 기록 (유입 소스: invite_code)
        await db.query(
            `INSERT INTO museum_visitors (site_id, visitor_user_id, source, referral_code)
             VALUES ($1, $2, 'invite_code', $3)
             ON CONFLICT DO NOTHING`,
            [invite.site_id, userId, rawCode]
        );

        res.json({ success: true, data: { site_id: invite.site_id, subdomain: invite.subdomain } });
    } catch (err) {
        console.error('acceptInvite error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// POST /api/invite/send-email
// 초대 이메일 발송 (이메일 정규화)
// ════════════════════════════════════════
exports.sendInviteEmailHandler = async (req, res) => {
    try {
        const { code, subdomain } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!email || !code) return res.status(400).json({ success: false, message: 'email and code required' });

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        // 초대에 이메일 기록
        await db.query(
            `UPDATE family_invites SET email = $1 WHERE (code = $2 OR short_code = $2)`,
            [email, (code || '').toUpperCase()]
        );

        await sendInviteEmail({ to: email, code, inviterName: req.user?.name || 'Someone', subdomain });
        res.json({ success: true });
    } catch (err) {
        console.error('sendInviteEmailHandler error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to send email' });
    }
};

// ════════════════════════════════════════
// GET /api/invite/status
// 내가 보낸 초대 현황
// ════════════════════════════════════════
exports.getInviteStatus = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT fi.id, fi.code, fi.short_code, fi.email, fi.status, fi.expires_at, fi.created_at,
                    fs.subdomain
             FROM family_invites fi
             JOIN family_sites fs ON fs.id = fi.site_id
             WHERE fi.inviter_id = $1
             ORDER BY fi.created_at DESC
             LIMIT 50`,
            [req.user.id]
        );

        const now = new Date();
        const data = rows.map(r => ({
            ...r,
            is_expired: new Date(r.expires_at) < now,
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error('getInviteStatus error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// POST /api/invite/resend
// 만료된 초대 재발송 (새 코드 생성 + 이메일 발송)
// ════════════════════════════════════════
exports.resendInvite = async (req, res) => {
    try {
        const { invite_id } = req.body;
        if (!invite_id) return res.status(400).json({ success: false, message: 'invite_id required' });

        // 기존 초대 조회 (본인 것만)
        const { rows } = await db.query(
            `SELECT fi.id, fi.site_id, fi.email, fs.subdomain
             FROM family_invites fi
             JOIN family_sites fs ON fs.id = fi.site_id
             WHERE fi.id = $1 AND fi.inviter_id = $2`,
            [invite_id, req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: '초대를 찾을 수 없습니다' });
        }

        const original = rows[0];
        if (!original.email) {
            return res.status(400).json({ success: false, message: '이메일이 없는 초대는 재발송할 수 없습니다' });
        }

        // 새 코드 생성
        const newCode = crypto.randomBytes(5).toString('hex').toUpperCase();
        const newShortCode = generateShortCode();

        // 기존 초대 갱신
        await db.query(
            `UPDATE family_invites
             SET code = $1, short_code = $2, status = 'pending',
                 expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
             WHERE id = $3`,
            [newCode, newShortCode, invite_id]
        );

        // 이메일 재발송
        await sendInviteEmail({
            to: original.email,
            code: newCode,
            inviterName: req.user?.name || 'Someone',
            subdomain: original.subdomain,
        });

        res.json({
            success: true,
            data: {
                code: newCode,
                short_code: newShortCode,
                url: `https://orgcell.com/invite?code=${newCode}`,
            },
        });
    } catch (err) {
        console.error('resendInvite error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
