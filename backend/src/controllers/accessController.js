/**
 * accessController.js — 전시관 접근 제어
 *
 * - 접근 요청 생성 (pending)
 * - 요청 목록 조회 (소유자용)
 * - 승인/거절 처리
 * - Telegram 알림 (소유자에게)
 */
const pool = require('../config/db');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8714841237';

// ── Telegram 알림 ──
async function sendTelegramAlert(message) {
    if (!TELEGRAM_BOT_TOKEN) return;
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
            }),
        });
    } catch (err) {
        console.error('[accessController] Telegram alert failed:', err.message);
    }
}

// ── 접근 권한 확인 ──
// 권한 우선순위:
// 1. 관장(사이트 소유자) → 모든 인물 접근 가능
// 2. 당사자 본인 (person.user_id === currentUser) → 본인 자료실 접근
// 3. 인물에 연결된 계정이 없으면(초대 미수락) → 관장에게 전권
// 4. 명시적 허가 (access_requests approved)
// 5. 그 외 → 거부
exports.checkAccess = async (req, res) => {
    const { siteId, personId } = req.params;
    const userId = req.user?.id;

    try {
        // 인물 + 사이트 소유자 정보를 한번에 조회
        const result = await pool.query(
            `SELECT p.privacy_level, p.is_refused, p.user_id AS person_user_id,
                    fs.user_id AS owner_id
             FROM persons p
             JOIN family_sites fs ON fs.id = p.site_id
             WHERE p.id = $1 AND p.site_id = $2`,
            [personId, siteId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Person not found' });
        }

        const { privacy_level, is_refused, person_user_id, owner_id } = result.rows[0];

        // 비로그인 → 공개 인물만 접근 가능
        if (!userId) {
            if (privacy_level === 'public' && !is_refused) {
                return res.json({ success: true, data: { access: 'granted', level: 'public' } });
            }
            return res.json({ success: true, data: { access: 'denied', level: 'auth_required' } });
        }

        // 1. 관장(사이트 소유자) → 무조건 허용
        if (userId === owner_id) {
            return res.json({ success: true, data: { access: 'granted', level: 'owner' } });
        }

        // 거절자 → 관장 외에는 접근 불가
        if (is_refused) {
            return res.json({ success: true, data: { access: 'denied', level: 'refused' } });
        }

        // 2. 당사자 본인 (인물에 연결된 계정)
        if (person_user_id && person_user_id === userId) {
            return res.json({ success: true, data: { access: 'granted', level: 'self' } });
        }

        // 3. 공개 인물 → 누구나 접근
        if (privacy_level === 'public') {
            return res.json({ success: true, data: { access: 'granted', level: 'public' } });
        }

        // 4. 명시적 허가 (승인된 요청)
        const approvedRes = await pool.query(
            `SELECT id FROM access_requests
             WHERE site_id = $1 AND person_id = $2 AND requester_user_id = $3 AND status = 'approved'`,
            [siteId, personId, userId]
        );
        if (approvedRes.rows.length > 0) {
            return res.json({ success: true, data: { access: 'granted', level: 'approved' } });
        }

        // 5. 대기 중인 요청
        const pendingRes = await pool.query(
            `SELECT id FROM access_requests
             WHERE site_id = $1 AND person_id = $2 AND requester_user_id = $3 AND status = 'pending'`,
            [siteId, personId, userId]
        );
        if (pendingRes.rows.length > 0) {
            return res.json({ success: true, data: { access: 'pending', level: 'requested' } });
        }

        // 6. 그 외 → 거부
        return res.json({ success: true, data: { access: 'denied', level: privacy_level } });
    } catch (err) {
        console.error('[accessController] checkAccess error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// ── 접근 요청 생성 ──
exports.requestAccess = async (req, res) => {
    const { siteId, personId } = req.params;
    const userId = req.user?.id;
    const { message, requestType = 'view' } = req.body;

    if (!userId) {
        return res.status(401).json({ success: false, error: 'Login required' });
    }

    try {
        // 중복 요청 방지
        const existing = await pool.query(
            `SELECT id FROM access_requests
             WHERE site_id = $1 AND person_id = $2 AND requester_user_id = $3
             AND request_type = $4 AND status = 'pending'`,
            [siteId, personId, userId, requestType]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: '이미 요청이 진행 중입니다' });
        }

        const result = await pool.query(
            `INSERT INTO access_requests (site_id, person_id, requester_user_id, request_type, message)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [siteId, personId, userId, requestType, message || null]
        );

        // 요청자 이름 조회
        const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
        const requesterName = userRes.rows[0]?.name || userRes.rows[0]?.email || 'Unknown';

        // 인물 이름 조회
        const personRes = await pool.query('SELECT name FROM persons WHERE id = $1', [personId]);
        const personName = personRes.rows[0]?.name || 'Unknown';

        // Telegram 알림
        await sendTelegramAlert(
            `🔔 <b>전시관 접근 요청</b>\n` +
            `요청자: ${requesterName}\n` +
            `대상: ${personName}\n` +
            `유형: ${requestType}\n` +
            `메시지: ${message || '(없음)'}`
        );

        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('[accessController] requestAccess error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// ── 요청 목록 조회 (소유자용) ──
exports.listRequests = async (req, res) => {
    const { siteId } = req.params;
    const { status = 'pending' } = req.query;

    try {
        const result = await pool.query(
            `SELECT ar.*,
                    u.name AS requester_name, u.email AS requester_email,
                    p.name AS person_name
             FROM access_requests ar
             JOIN users u ON ar.requester_user_id = u.id
             JOIN persons p ON ar.person_id = p.id
             WHERE ar.site_id = $1 AND ar.status = $2
             ORDER BY ar.created_at DESC`,
            [siteId, status]
        );
        return res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('[accessController] listRequests error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// ── 요청 승인/거절 ──
exports.respondToRequest = async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user?.id;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action. Use approve or reject.' });
    }

    try {
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const result = await pool.query(
            `UPDATE access_requests
             SET status = $1, responded_at = NOW(), responded_by = $2, updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [newStatus, userId, requestId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }

        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('[accessController] respondToRequest error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
