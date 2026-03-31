const db = require('../config/db');
const crypto = require('crypto');

// POST /api/request — 새 사진 요청 링크 생성 (로그인 필요)
exports.createRequest = async (req, res) => {
    try {
        const { site_id, message } = req.body;
        if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });

        const token = crypto.randomBytes(24).toString('hex');
        const requesterName = req.user?.name || req.user?.email || '가족';

        const { rows } = await db.query(
            `INSERT INTO photo_requests (site_id, token, requester_id, requester_name, message)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [site_id, token, req.user.id, requesterName, message || null]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('createRequest error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/request/:token — 요청 정보 + 슬라이드쇼용 사진 (공개, 인증 불필요)
exports.getRequest = async (req, res) => {
    try {
        const { token } = req.params;

        const { rows: reqRows } = await db.query(
            `SELECT pr.*, fs.subdomain, fs.display_name AS museum_name
             FROM photo_requests pr
             JOIN family_sites fs ON fs.id = pr.site_id
             WHERE pr.token = $1 AND pr.expires_at > NOW()`,
            [token]
        );
        if (!reqRows.length) {
            return res.status(404).json({ success: false, message: '만료되었거나 존재하지 않는 요청입니다' });
        }
        const request = reqRows[0];

        // 슬라이드쇼용: 공개/가족공개 사진 (최대 30장)
        const { rows: photos } = await db.query(
            `SELECT ep.url, ep.original_name, ep.created_at,
                    e.title AS exhibition_title
             FROM exhibition_photos ep
             JOIN exhibitions e ON e.id = ep.exhibition_id
             WHERE e.site_id = $1
               AND e.visibility IN ('public', 'family')
             ORDER BY ep.created_at DESC
             LIMIT 30`,
            [request.site_id]
        );

        res.json({
            success: true,
            data: {
                requesterName: request.requester_name,
                museumName: request.museum_name || request.subdomain,
                subdomain: request.subdomain,
                siteId: request.site_id,
                message: request.message,
                photos,
            },
        });
    } catch (err) {
        console.error('getRequest error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/request/:token/upload — 비로그인 사진 업로드
exports.uploadToRequest = async (req, res) => {
    try {
        const { token } = req.params;
        const { uploader_name } = req.body;
        const files = req.files;

        if (!uploader_name?.trim()) {
            return res.status(400).json({ success: false, message: '이름을 입력해주세요' });
        }
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: '사진을 선택해주세요' });
        }

        // 토큰 유효성 확인
        const { rows: reqRows } = await db.query(
            `SELECT pr.*, fs.subdomain FROM photo_requests pr
             JOIN family_sites fs ON fs.id = pr.site_id
             WHERE pr.token = $1 AND pr.expires_at > NOW()`,
            [token]
        );
        if (!reqRows.length) {
            return res.status(404).json({ success: false, message: '만료되었거나 존재하지 않는 요청입니다' });
        }
        const request = reqRows[0];

        // IP 기반 스팸 방지: 1시간 내 10장
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        const { rows: recentRows } = await db.query(
            `SELECT COUNT(*) AS cnt FROM photo_inbox
             WHERE sender_name = $1 AND site_id = $2
               AND created_at > NOW() - INTERVAL '1 hour'`,
            [uploader_name.trim(), request.site_id]
        );
        const recentCount = parseInt(recentRows[0]?.cnt || 0, 10);
        if (recentCount + files.length > 10) {
            return res.status(429).json({
                success: false,
                message: '1시간 내 최대 10장까지 업로드할 수 있습니다',
            });
        }

        const inserted = [];
        for (const file of files) {
            const url = `/uploads/exhibitions/${file.filename}`;
            const { rows } = await db.query(
                `INSERT INTO photo_inbox
                 (site_id, sender_id, sender_name, filename, original_name, mime_type, file_size, url, status)
                 VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 'pending')
                 RETURNING *`,
                [request.site_id, uploader_name.trim(), file.filename, file.originalname, file.mimetype, file.size, url]
            );
            inserted.push(rows[0]);
        }

        res.status(201).json({
            success: true,
            data: inserted,
            requesterName: request.requester_name,
        });
    } catch (err) {
        console.error('uploadToRequest error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
