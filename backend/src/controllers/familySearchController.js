const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/db');
const fsService = require('../services/familySearchService');

const FS_APP_KEY = process.env.FS_APP_KEY || 'b00B25XDYH90S6W5RKFF';
const FS_AUTH_BASE = process.env.FS_AUTH_BASE || 'https://identbeta.familysearch.org';
const FS_API_BASE = process.env.FS_API_BASE || 'https://api-integ.familysearch.org';
const REDIRECT_URI = `${process.env.FRONTEND_URL || 'https://orgcell.com'}/familysearch-callback`;

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

// ── Helper: OC-ID 생성 ("OC-" + 8자 랜덤) ──
function generateOcId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'OC-';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

// ── Helper: 매칭 유사도 계산 ──
function calcSimilarity(fsPerson, dbPerson) {
    let score = 0;

    // 이름 일치 (+0.4)
    if (fsPerson.name && dbPerson.name) {
        const fsName = fsPerson.name.replace(/\s/g, '').toLowerCase();
        const dbName = dbPerson.name.replace(/\s/g, '').toLowerCase();
        if (fsName === dbName) score += 0.4;
    }

    // 생년 일치 (+0.3)
    if (fsPerson.birth_year && dbPerson.birth_year) {
        if (fsPerson.birth_year === dbPerson.birth_year) score += 0.3;
    }

    // 사망년 일치 (+0.2)
    if (fsPerson.death_year && dbPerson.death_year) {
        if (fsPerson.death_year === dbPerson.death_year) score += 0.2;
    }

    // 성별 일치 (+0.1)
    if (fsPerson.gender && dbPerson.gender) {
        if (fsPerson.gender === dbPerson.gender) score += 0.1;
    }

    return score;
}

// ── Helper: 인물 매칭 (DB 조회) ──
async function findMatch(siteId, fsPerson) {
    // Step 1: person_external_ids에서 정확 일치
    const { rows: exactRows } = await db.query(
        `SELECT pei.person_id, p.name, p.birth_year, p.gender
         FROM person_external_ids pei
         JOIN persons p ON p.id = pei.person_id
         WHERE pei.source = 'familysearch'
           AND pei.external_id = $1
           AND p.site_id = $2`,
        [fsPerson.fs_id, siteId]
    );
    if (exactRows.length > 0) {
        return {
            status: 'suggest',
            person_id: exactRows[0].person_id,
            person_name: exactRows[0].name,
            score: 1.0,
            reason: 'FamilySearch ID 정확 일치',
        };
    }

    // Step 1.5: 기존 persons.fs_person_id에서도 확인 (이관 전 호환)
    const { rows: legacyRows } = await db.query(
        `SELECT id, name, birth_year, gender FROM persons
         WHERE site_id = $1 AND fs_person_id = $2`,
        [siteId, fsPerson.fs_id]
    );
    if (legacyRows.length > 0) {
        return {
            status: 'suggest',
            person_id: legacyRows[0].id,
            person_name: legacyRows[0].name,
            score: 1.0,
            reason: 'FamilySearch ID 정확 일치 (레거시)',
        };
    }

    // Step 2: 이름+생년+사망년+성별 유사도
    const { rows: candidates } = await db.query(
        `SELECT id, name, birth_year, death_year, gender FROM persons WHERE site_id = $1`,
        [siteId]
    );

    let bestMatch = null;
    let bestScore = 0;

    for (const cand of candidates) {
        const score = calcSimilarity(fsPerson, cand);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = cand;
        }
    }

    if (bestScore >= 0.7 && bestMatch) {
        return {
            status: 'suggest',
            person_id: bestMatch.id,
            person_name: bestMatch.name,
            score: bestScore,
            reason: `유사도 ${Math.round(bestScore * 100)}%`,
        };
    }

    return { status: 'new', person_id: null, score: 0, reason: null };
}

// ════════════════════════════════════════
// OAuth 엔드포인트 (기존 유지)
// ════════════════════════════════════════

// @route GET /api/familysearch/auth
exports.getFsAuthUrl = (req, res) => {
    const authUrl = `${FS_AUTH_BASE}/cis-web/oauth2/v3/authorization`
        + `?response_type=code`
        + `&client_id=${FS_APP_KEY}`
        + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    res.json({ success: true, authUrl });
};

// @route POST /api/familysearch/callback
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

// @route GET /api/familysearch/status
exports.fsStatus = async (req, res) => {
    try {
        const token = await getFsToken(req.user.id);
        res.json({ success: true, connected: !!token });
    } catch (error) {
        console.error('fsStatus Error:', error);
        res.status(500).json({ success: false, message: '상태 확인 실패' });
    }
};

// @route POST /api/familysearch/disconnect
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

// @route GET /api/familysearch/person/:fsPersonId
exports.getFsPerson = async (req, res) => {
    try {
        const token = await getFsToken(req.user.id);
        if (!token) {
            return res.status(401).json({ success: false, message: 'FamilySearch에 연결되지 않았습니다.' });
        }

        const person = await fsService.getPerson(token, req.params.fsPersonId);
        if (!person) {
            return res.status(404).json({ success: false, message: '인물을 찾을 수 없습니다.' });
        }

        res.json({ success: true, data: person });
    } catch (error) {
        console.error('getFsPerson Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: '인물 조회에 실패했습니다.' });
    }
};

// ════════════════════════════════════════
// 기존 getFsTree (레거시, 하위 호환)
// ════════════════════════════════════════

// @route GET /api/familysearch/tree/:siteId
exports.getFsTree = async (req, res) => {
    try {
        const token = await getFsToken(req.user.id);
        if (!token) {
            return res.status(401).json({ success: false, message: 'FamilySearch에 연결되지 않았습니다.' });
        }

        const currentPerson = await fsService.getPerson(token, null);
        // 레거시: /platform/tree/ancestry 사용
        const { data } = await axios.get(`${FS_API_BASE}/platform/tree/ancestry?person=${req.query.personId || 'current'}&generations=4`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });

        res.json({ success: true, data: { persons: data?.persons || [] } });
    } catch (error) {
        console.error('getFsTree Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ success: false, message: 'FamilySearch 토큰이 만료되었습니다.' });
        }
        res.status(500).json({ success: false, message: '가계도 가져오기에 실패했습니다.' });
    }
};

// ════════════════════════════════════════
// 신규: 가족트리 가져오기 (큐 방식, DB 저장 안 함)
// ════════════════════════════════════════

// @route GET /api/familysearch/tree/import?siteId=1&maxGen=5
exports.importTree = async (req, res) => {
    try {
        const token = await getFsToken(req.user.id);
        if (!token) {
            return res.status(401).json({ success: false, message: 'FamilySearch에 연결되지 않았습니다.' });
        }

        const siteId = parseInt(req.query.siteId, 10);
        const maxGen = Math.min(parseInt(req.query.maxGen, 10) || 2, 8);

        if (!siteId) {
            return res.status(400).json({ success: false, message: 'siteId가 필요합니다.' });
        }

        // 관장 권한 확인
        const { rows: siteRows } = await db.query(
            `SELECT user_id FROM family_sites WHERE id = $1`,
            [siteId]
        );
        if (!siteRows[0] || siteRows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '관장만 가져올 수 있습니다.' });
        }

        // ── 현재 사용자의 FS person ID ──
        const currentData = await axios.get(`${FS_API_BASE}/platform/tree/current-person`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            timeout: 15000,
        });
        const rootPid = currentData.data?.persons?.[0]?.id;
        if (!rootPid) {
            return res.status(404).json({ success: false, message: 'FamilySearch 사용자 정보를 찾을 수 없습니다.' });
        }

        // ── BFS 큐 ──
        const queue = [{ pid: rootPid, gen: 0 }];
        const visited = new Set();
        const result = [];

        while (queue.length > 0) {
            const { pid, gen } = queue.shift();

            if (visited.has(pid)) continue;
            if (gen > maxGen) continue;
            visited.add(pid);

            try {
                // 인물 정보
                const person = await fsService.getPerson(token, pid);
                if (!person) continue;

                // 부모 → 큐에 추가 (gen+1)
                const parents = await fsService.getParents(token, pid);
                for (const p of parents) {
                    if (p.fs_id && !visited.has(p.fs_id) && gen + 1 <= maxGen) {
                        queue.push({ pid: p.fs_id, gen: gen + 1 });
                    }
                }

                // 배우자 → 큐에 추가 안 함 (관계만 기록)
                const spouses = await fsService.getSpouses(token, pid);

                // 자녀 → gen=0만 호출 (큐에 추가 안 함)
                let children = [];
                if (gen === 0) {
                    children = await fsService.getChildren(token, pid);
                }

                // 매칭 결과
                const match = await findMatch(siteId, person);

                result.push({
                    fs_id: person.fs_id,
                    name: person.name,
                    gender: person.gender,
                    birth_year: person.birth_year,
                    death_year: person.death_year,
                    birth_place: person.birth_place,
                    living: person.living,
                    generation: gen,
                    match,
                    relations: {
                        parents: parents.map((p) => ({ fs_id: p.fs_id, name: p.name, role: p.role })),
                        spouses: spouses.map((s) => ({ fs_id: s.fs_id, name: s.name })),
                        children: children.map((c) => ({ fs_id: c.fs_id, name: c.name })),
                    },
                });
            } catch (err) {
                // 개별 인물 조회 실패 시 건너뛰기 (전체 중단 안 함)
                console.error(`[FS Import] ${pid} 조회 실패:`, err.response?.status || err.message);
                continue;
            }
        }

        // ── 통계 ──
        const stats = {
            total: result.length,
            suggest: result.filter((r) => r.match.status === 'suggest').length,
            new: result.filter((r) => r.match.status === 'new').length,
        };

        res.json({
            success: true,
            data: {
                rootFsId: rootPid,
                maxGeneration: maxGen,
                persons: result,
                stats,
            },
        });
    } catch (error) {
        console.error('importTree Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ success: false, message: 'FamilySearch 토큰이 만료되었습니다. 다시 연결해주세요.' });
        }
        res.status(500).json({ success: false, message: '가족트리 가져오기에 실패했습니다.' });
    }
};

// ════════════════════════════════════════
// 신규: 관장 확인 후 인물 저장
// ════════════════════════════════════════

// @route POST /api/familysearch/tree/add
exports.addPersons = async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { siteId, persons } = req.body;

        if (!siteId || !Array.isArray(persons) || persons.length === 0) {
            return res.status(400).json({ success: false, message: 'siteId와 persons 배열이 필요합니다.' });
        }

        // 관장 권한 확인
        const { rows: siteRows } = await client.query(
            `SELECT user_id FROM family_sites WHERE id = $1`,
            [siteId]
        );
        if (!siteRows[0] || siteRows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '관장만 인물을 추가할 수 있습니다.' });
        }

        await client.query('BEGIN');

        const counts = { added: 0, linked: 0, skipped: 0 };
        // fs_id → new person_id 매핑 (관계 연결용)
        const fsIdToPersonId = {};

        // Pass 1: 인물 생성/연결
        for (const p of persons) {
            if (p.action === 'skip') {
                counts.skipped++;
                continue;
            }

            if (p.action === 'link' && p.person_id) {
                // 기존 인물에 FamilySearch ID 연결
                const ocId = generateOcId();
                await client.query(
                    `INSERT INTO person_external_ids (person_id, oc_id, source, external_id, verified, confidence_level, added_by)
                     VALUES ($1, $2, 'familysearch', $3, true, 2, 'curator')
                     ON CONFLICT (source, external_id) DO UPDATE SET
                        person_id = EXCLUDED.person_id,
                        verified = true,
                        confidence_level = 2`,
                    [p.person_id, ocId, p.fs_id]
                );

                // persons.fs_person_id도 갱신 (레거시 호환)
                await client.query(
                    `UPDATE persons SET fs_person_id = $1, fs_synced_at = NOW() WHERE id = $2`,
                    [p.fs_id, p.person_id]
                );

                fsIdToPersonId[p.fs_id] = p.person_id;
                counts.linked++;
                continue;
            }

            if (p.action === 'create') {
                // 새 인물 생성
                const gender = p.gender || 'other';
                const isDeceased = p.living === false || !!p.death_year;

                const { rows: newRows } = await client.query(
                    `INSERT INTO persons (site_id, name, gender, birth_year, death_year, is_deceased, fs_person_id, fs_synced_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                     RETURNING id`,
                    [siteId, p.name, gender, p.birth_year || null, p.death_year || null, isDeceased, p.fs_id]
                );

                const newPersonId = newRows[0].id;
                const ocId = generateOcId();

                await client.query(
                    `INSERT INTO person_external_ids (person_id, oc_id, source, external_id, verified, confidence_level, added_by)
                     VALUES ($1, $2, 'familysearch', $3, true, 2, 'curator')
                     ON CONFLICT (source, external_id) DO UPDATE SET
                        person_id = EXCLUDED.person_id,
                        verified = true`,
                    [newPersonId, ocId, p.fs_id]
                );

                fsIdToPersonId[p.fs_id] = newPersonId;
                counts.added++;
                continue;
            }
        }

        // Pass 2: 관계 연결
        for (const p of persons) {
            if (p.action === 'skip') continue;

            const personId = fsIdToPersonId[p.fs_id] || p.person_id;
            if (!personId || !p.relations) continue;

            // 부모 관계
            if (p.relations.parents) {
                for (const parent of p.relations.parents) {
                    const parentPersonId = fsIdToPersonId[parent.fs_id];
                    if (!parentPersonId) continue;

                    await client.query(
                        `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type)
                         VALUES ($1, $2, $3, 'parent')
                         ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
                        [siteId, parentPersonId, personId]
                    );
                }
            }

            // 배우자 관계
            if (p.relations.spouses) {
                for (const spouse of p.relations.spouses) {
                    const spousePersonId = fsIdToPersonId[spouse.fs_id];
                    if (!spousePersonId) continue;

                    await client.query(
                        `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type)
                         VALUES ($1, $2, $3, 'spouse')
                         ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
                        [siteId, personId, spousePersonId]
                    );
                }
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            data: counts,
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('addPersons Error:', error);
        res.status(500).json({ success: false, message: '인물 추가에 실패했습니다.' });
    } finally {
        client.release();
    }
};

// ════════════════════════════════════════
// 신규: Memories(사진/문서) 가져오기
// ════════════════════════════════════════

// @route GET /api/familysearch/memories/list?siteId=1
// 저장된 인물들의 FS memories를 일괄 조회 (DB에 저장 안 함)
exports.listMemories = async (req, res) => {
    try {
        const token = await getFsToken(req.user.id);
        if (!token) {
            return res.status(401).json({ success: false, message: 'FamilySearch에 연결되지 않았습니다.' });
        }

        const siteId = parseInt(req.query.siteId, 10);
        if (!siteId) {
            return res.status(400).json({ success: false, message: 'siteId가 필요합니다.' });
        }

        // fs_person_id가 있는 인물들 조회
        const { rows: persons } = await db.query(
            `SELECT id, name, fs_person_id FROM persons
             WHERE site_id = $1 AND fs_person_id IS NOT NULL`,
            [siteId]
        );

        const results = [];
        for (const person of persons) {
            try {
                const memories = await fsService.getMemories(token, person.fs_person_id);
                if (memories.length > 0) {
                    results.push({
                        person_id: person.id,
                        person_name: person.name,
                        fs_person_id: person.fs_person_id,
                        memories,
                    });
                }
            } catch (err) {
                // 개별 실패는 건너뛰기
                console.error(`[FS Memories] ${person.fs_person_id} 조회 실패:`, err.response?.status || err.message);
            }
        }

        const totalMemories = results.reduce((sum, r) => sum + r.memories.length, 0);
        res.json({
            success: true,
            data: {
                personsWithMemories: results.length,
                totalMemories,
                persons: results,
            },
        });
    } catch (error) {
        console.error('listMemories Error:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ success: false, message: 'FamilySearch 토큰이 만료되었습니다.' });
        }
        res.status(500).json({ success: false, message: 'Memories 조회에 실패했습니다.' });
    }
};

// @route POST /api/familysearch/memories/import
// 선택된 memories를 fs_memories 테이블에 저장
exports.importMemories = async (req, res) => {
    try {
        const { siteId, memories } = req.body;

        if (!siteId || !Array.isArray(memories) || memories.length === 0) {
            return res.status(400).json({ success: false, message: 'siteId와 memories 배열이 필요합니다.' });
        }

        // 관장 권한 확인
        const { rows: siteRows } = await db.query(
            `SELECT user_id FROM family_sites WHERE id = $1`,
            [siteId]
        );
        if (!siteRows[0] || siteRows[0].user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: '관장만 가져올 수 있습니다.' });
        }

        let imported = 0;
        for (const m of memories) {
            try {
                await db.query(
                    `INSERT INTO fs_memories (site_id, person_id, fs_memory_id, memory_type, title, description, fs_url)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (fs_memory_id) DO NOTHING`,
                    [siteId, m.person_id, m.fs_memory_id, m.type || 'photo', m.title || '', m.description || '', m.url || null]
                );
                imported++;
            } catch (err) {
                console.error(`[FS Memory Import] ${m.fs_memory_id} 실패:`, err.message);
            }
        }

        res.json({
            success: true,
            data: { imported, total: memories.length },
        });
    } catch (error) {
        console.error('importMemories Error:', error);
        res.status(500).json({ success: false, message: 'Memories 저장에 실패했습니다.' });
    }
};
