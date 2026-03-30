const axios = require('axios');
const db = require('../config/db');

const FS_APP_KEY = process.env.FS_APP_KEY || 'b00B25XDYH90S6W5RKFF';
const FS_AUTH_BASE = process.env.FS_AUTH_BASE || 'https://identbeta.familysearch.org';
const FS_API_BASE = process.env.FS_API_BASE || 'https://api.familysearch.org';
const REDIRECT_URI = `${process.env.FRONTEND_URL || 'https://orgcell.com'}/familysearch-callback`;

// ── Helper: FS API 호출 ──
async function fsApi(accessToken, path) {
    const { data } = await axios.get(`${FS_API_BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
        },
    });
    return data;
}

// ── Helper: 유저의 FS 토큰 가져오기 ──
async function getFsToken(userId) {
    const { rows } = await db.query(
        `SELECT fs_access_token, fs_token_expires_at FROM users WHERE id = $1`,
        [userId]
    );
    if (!rows[0]?.fs_access_token) return null;
    if (rows[0].fs_token_expires_at && new Date(rows[0].fs_token_expires_at) < new Date()) return null;
    return rows[0].fs_access_token;
}

// @desc    FamilySearch OAuth 로그인 URL 생성
// @route   GET /api/familysearch/auth
exports.getFsAuthUrl = (req, res) => {
    const authUrl = `${FS_AUTH_BASE}/cis-web/oauth2/v3/authorization`
        + `?response_type=code`
        + `&client_id=${FS_APP_KEY}`
        + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    res.json({ success: true, authUrl });
};

// @desc    FamilySearch OAuth callback — code → access_token
// @route   POST /api/familysearch/callback
exports.fsCallback = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: '인증 코드가 없습니다.' });
        }

        const tokenRes = await axios.post(
            `${FS_AUTH_BASE}/cis-web/oauth2/v3/token`,
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: FS_APP_KEY,
                redirect_uri: REDIRECT_URI,
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
        );

        const { access_token, expires_in } = tokenRes.data;
        const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

        await db.query(
            `UPDATE users SET fs_access_token = $1, fs_token_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [access_token, expiresAt, req.user.id]
        );

        res.json({ success: true, message: 'FamilySearch 연결 완료' });
    } catch (error) {
        console.error('fsCallback Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'FamilySearch 연결에 실패했습니다.' });
    }
};

// @desc    FamilySearch 연결 상태 확인
// @route   GET /api/familysearch/status
exports.fsStatus = async (req, res) => {
    try {
        const token = await getFsToken(req.user.id);
        res.json({ success: true, connected: !!token });
    } catch (error) {
        console.error('fsStatus Error:', error);
        res.status(500).json({ success: false, message: '상태 확인 실패' });
    }
};

// @desc    FamilySearch 연결 해제
// @route   POST /api/familysearch/disconnect
exports.fsDisconnect = async (req, res) => {
    try {
        await db.query(
            `UPDATE users SET fs_access_token = NULL, fs_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [req.user.id]
        );
        res.json({ success: true, message: 'FamilySearch 연결이 해제되었습니다.' });
    } catch (error) {
        console.error('fsDisconnect Error:', error);
        res.status(500).json({ success: false, message: '연결 해제 실패' });
    }
};

// @desc    현재 사용자의 FamilySearch 가계도 가져오기
// @route   GET /api/familysearch/tree/:siteId
exports.getFsTree = async (req, res) => {
    try {
        const token = await getFsToken(req.user.id);
        if (!token) {
            return res.status(401).json({ success: false, message: 'FamilySearch에 연결되지 않았습니다.' });
        }

        // 현재 사용자 정보
        const currentPerson = await fsApi(token, '/platform/tree/current-person');
        const personId = currentPerson?.persons?.[0]?.id;
        if (!personId) {
            return res.status(404).json({ success: false, message: 'FamilySearch 사용자 정보를 찾을 수 없습니다.' });
        }

        // 4세대 조상 가져오기
        const ancestry = await fsApi(token, `/platform/tree/ancestry?person=${personId}&generations=4`);
        const persons = ancestry?.persons || [];

        // DB에 저장 (upsert)
        const siteId = req.params.siteId;
        const imported = [];

        for (const fsPerson of persons) {
            const display = fsPerson.display || {};
            const name = display.name || 'Unknown';
            const gender = display.gender === 'Male' ? 'male' : display.gender === 'Female' ? 'female' : 'other';
            const birthYear = display.birthDate ? parseInt(display.birthDate.match(/\d{4}/)?.[0]) || null : null;
            const deathYear = display.deathDate ? parseInt(display.deathDate.match(/\d{4}/)?.[0]) || null : null;

            const { rows } = await db.query(
                `INSERT INTO persons (site_id, name, gender, birth_year, death_year, fs_person_id, fs_data, fs_synced_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                 ON CONFLICT (site_id, fs_person_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    gender = EXCLUDED.gender,
                    birth_year = EXCLUDED.birth_year,
                    death_year = EXCLUDED.death_year,
                    fs_data = EXCLUDED.fs_data,
                    fs_synced_at = NOW()
                 RETURNING id, name, fs_person_id`,
                [siteId, name, gender, birthYear, deathYear, fsPerson.id, JSON.stringify(fsPerson)]
            );
            if (rows[0]) imported.push(rows[0]);
        }

        // 관계 가져오기 + 저장
        const relationships = ancestry?.childAndParentsRelationships || [];
        for (const rel of relationships) {
            const childFsId = rel.child?.resourceId;
            const parent1FsId = rel.parent1?.resourceId;
            const parent2FsId = rel.parent2?.resourceId;

            if (childFsId && (parent1FsId || parent2FsId)) {
                const childRow = imported.find(p => p.fs_person_id === childFsId);
                if (!childRow) continue;

                for (const parentFsId of [parent1FsId, parent2FsId].filter(Boolean)) {
                    const parentRow = imported.find(p => p.fs_person_id === parentFsId);
                    if (!parentRow) continue;

                    await db.query(
                        `INSERT INTO person_relations (site_id, person_id, related_person_id, relation_type, fs_relationship_id)
                         VALUES ($1, $2, $3, 'parent', $4)
                         ON CONFLICT DO NOTHING`,
                        [siteId, parentRow.id, childRow.id, rel.id || null]
                    );
                }
            }
        }

        res.json({
            success: true,
            data: {
                rootPersonId: personId,
                importedCount: imported.length,
                persons: imported,
            },
        });
    } catch (error) {
        console.error('getFsTree Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ success: false, message: 'FamilySearch 토큰이 만료되었습니다. 다시 연결해주세요.' });
        }
        res.status(500).json({ success: false, message: '가계도 가져오기에 실패했습니다.' });
    }
};

// @desc    특정 인물 FamilySearch 정보 조회
// @route   GET /api/familysearch/person/:fsPersonId
exports.getFsPerson = async (req, res) => {
    try {
        const token = await getFsToken(req.user.id);
        if (!token) {
            return res.status(401).json({ success: false, message: 'FamilySearch에 연결되지 않았습니다.' });
        }

        const personData = await fsApi(token, `/platform/tree/persons/${req.params.fsPersonId}`);
        const person = personData?.persons?.[0];
        if (!person) {
            return res.status(404).json({ success: false, message: '인물을 찾을 수 없습니다.' });
        }

        res.json({ success: true, data: person });
    } catch (error) {
        console.error('getFsPerson Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: '인물 조회에 실패했습니다.' });
    }
};
