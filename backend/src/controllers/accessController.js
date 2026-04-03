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
exports.checkAccess = async (req, res) => {
    const { siteId, personId } = req.params;
    const userId = req.user?.id;

    try {
        // 1. 인물 privacy 확인
        const personRes = await pool.query(
            'SELECT privacy_level, is_refused FROM persons WHERE id = $1 AND site_id = $2',
            [personId, siteId]
        );
        if (personRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Person not found' });
        }

        const person = personRes.rows[0];

        // 공개 인물 → 항상 접근 가능
        if (person.privacy_level === 'public') {
            return res.json({ success: true, data: { access: 'granted', level: 'public' } });
        }

        // 거절자 → 항상 접근 불가
        if (person.is_refused) {
            return res.json({ success: true, data: { access: 'denied', level: 'refused' } });
        }

        // 비로그인 → 접근 불가
        if (!userId) {
            return res.json({ success: true, data: { access: 'denied', level: 'auth_required' } });
        }

        // 2. 사이트 소유자/멤버 → 접근 가능
        const memberRes = await pool.query(
            'SELECT role FROM site_members WHERE site_id = $1 AND user_id = $2',
            [siteId, userId]
        );
        if (memberRes.rows.length > 0) {
            return res.json({ success: true, data: { access: 'granted', level: 'member' } });
        }

        // 3. 승인된 요청 확인
        const approvedRes = await pool.query(
            `SELECT id FROM access_requests
             WHERE site_id = $1 AND person_id = $2 AND requester_user_id = $3 AND status = 'approved'`,
            [siteId, personId, userId]
        );
        if (approvedRes.rows.length > 0) {
            return res.json({ success: true, data: { access: 'granted', level: 'approved' } });
        }

        // 4. 대기 중인 요청 확인
        const pendingRes = await pool.query(
            `SELECT id FROM access_requests
             WHERE site_id = $1 AND person_id = $2 AND requester_user_id = $3 AND status = 'pending'`,
            [siteId, personId, userId]
        );
        if (pendingRes.rows.length > 0) {
            return res.json({ success: true, data: { access: 'pending', level: 'requested' } });
        }

        // 5. family → 가족만, private → 본인만
        return res.json({ success: true, data: { access: 'denied', level: person.privacy_level } });
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
