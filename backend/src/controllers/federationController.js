const db = require('../config/db');
const {
    generateKeyPair,
    signFederationJWT,
    signChainJWT,
    verifyFederationJWT,
    validateScope,
    intersectScopes,
    encryptPrivateKey,
    decryptPrivateKey,
} = require('../utils/federationJWT');

// ── 헬퍼: 사이트 오너인지 확인 ──
async function checkSiteOwner(userId, siteId) {
    const { rows } = await db.query(
        'SELECT id FROM family_sites WHERE id = $1 AND user_id = $2',
        [siteId, userId]
    );
    return rows.length > 0;
}

// ── 헬퍼: 도메인(subdomain)으로 사이트 찾기 ──
async function findSiteByDomain(domain) {
    const { rows } = await db.query(
        'SELECT id, user_id, subdomain FROM family_sites WHERE subdomain = $1',
        [domain]
    );
    return rows[0] || null;
}

// ── 헬퍼: 도메인 공개키 가져오기 또는 생성 ──
async function getOrCreateDomainKeys(siteId, domain) {
    const { rows } = await db.query(
        'SELECT * FROM domain_public_keys WHERE site_id = $1',
        [siteId]
    );
    if (rows.length > 0) {
        return {
            publicKey: rows[0].public_key,
            privateKey: decryptPrivateKey(rows[0].private_key_encrypted),
        };
    }

    const { publicKey, privateKey } = generateKeyPair();
    const privateKeyEnc = encryptPrivateKey(privateKey);
    await db.query(
        `INSERT INTO domain_public_keys (domain, site_id, public_key, private_key_encrypted)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (domain) DO UPDATE SET public_key = $3, private_key_encrypted = $4`,
        [domain, siteId, publicKey, privateKeyEnc]
    );
    return { publicKey, privateKey };
}

// ── 관계 타입별 scope 기본값 ──
const DEFAULT_SCOPES = {
    direct: ['profile', 'photos.public', 'photos.family', 'exhibitions'],
    collateral: ['profile', 'photos.public'],
    spouse: ['profile', 'photos.public', 'exhibitions'],
};

// ════════════════════════════════════════
// API 1: 연합 요청
// POST /api/federation/request
// ════════════════════════════════════════
exports.createRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetDomain, sourceSiteId, sourceNodeId, targetNodeId, relationType } = req.body;

        if (!targetDomain || !sourceSiteId || !relationType) {
            return res.status(400).json({ success: false, message: 'targetDomain, sourceSiteId, relationType are required' });
        }

        const validTypes = ['direct', 'collateral', 'spouse'];
        if (!validTypes.includes(relationType)) {
            return res.status(400).json({ success: false, message: `Invalid relationType. Must be: ${validTypes.join(', ')}` });
        }

        // 요청자가 소스 사이트 오너인지 확인
        if (!await checkSiteOwner(userId, sourceSiteId)) {
            return res.status(403).json({ success: false, message: '사이트 오너만 연합 요청할 수 있습니다' });
        }

        // 소스 도메인 조회
        const { rows: siteRows } = await db.query(
            'SELECT subdomain FROM family_sites WHERE id = $1', [sourceSiteId]
        );
        if (!siteRows.length) {
            return res.status(404).json({ success: false, message: 'Source site not found' });
        }
        const sourceDomain = siteRows[0].subdomain;

        // 타겟 사이트 조회
        const targetSite = await findSiteByDomain(targetDomain);
        if (!targetSite) {
            return res.status(404).json({ success: false, message: '대상 박물관을 찾을 수 없습니다' });
        }

        // 자기 자신과 연합 불가
        if (targetSite.id === parseInt(sourceSiteId)) {
            return res.status(400).json({ success: false, message: '자기 자신과는 연합할 수 없습니다' });
        }

        // 이미 pending/accepted 요청 있는지 확인
        const { rows: existing } = await db.query(
            `SELECT id FROM federation_requests
             WHERE source_site_id = $1 AND target_site_id = $2 AND status IN ('pending','accepted')`,
            [sourceSiteId, targetSite.id]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: '이미 연합 요청이 존재합니다' });
        }

        // RSA 키쌍 생성/가져오기
        const { publicKey } = await getOrCreateDomainKeys(sourceSiteId, sourceDomain);

        const defaultScope = DEFAULT_SCOPES[relationType] || DEFAULT_SCOPES.collateral;

        const { rows } = await db.query(
            `INSERT INTO federation_requests
             (source_site_id, target_site_id, source_domain, target_domain,
              source_node_id, target_node_id, relation_type, source_public_key,
              requester_id, agreed_scope)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [sourceSiteId, targetSite.id, sourceDomain, targetDomain,
             sourceNodeId || null, targetNodeId || null, relationType,
             publicKey, userId, JSON.stringify(defaultScope)]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('federation createRequest error:', err);
        res.status(500).json({ success: false, message: 'Failed to create federation request' });
    }
};

// ════════════════════════════════════════
// API 2: 연합 승인
// POST /api/federation/accept
// ════════════════════════════════════════
exports.acceptRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId, targetNodeId, agreedScope } = req.body;

        if (!requestId) {
            return res.status(400).json({ success: false, message: 'requestId is required' });
        }

        // 요청 조회
        const { rows: reqRows } = await db.query(
            'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
            [requestId, 'pending']
        );
        if (!reqRows.length) {
            return res.status(404).json({ success: false, message: '대기 중인 연합 요청이 없습니다' });
        }
        const fedReq = reqRows[0];

        // 타겟 사이트 오너인지 확인
        if (!await checkSiteOwner(userId, fedReq.target_site_id)) {
            return res.status(403).json({ success: false, message: '대상 사이트 오너만 승인할 수 있습니다' });
        }

        // 타겟 도메인의 RSA 키쌍 생성/가져오기
        const { publicKey } = await getOrCreateDomainKeys(fedReq.target_site_id, fedReq.target_domain);

        // scope 결정 (사용자 지정 또는 기본값)
        const finalScope = agreedScope || DEFAULT_SCOPES[fedReq.relation_type] || DEFAULT_SCOPES.collateral;

        const { rows } = await db.query(
            `UPDATE federation_requests SET
                status = 'accepted',
                target_public_key = $1,
                target_node_id = $2,
                agreed_scope = $3,
                responder_id = $4,
                updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [publicKey, targetNodeId || null, JSON.stringify(finalScope), userId, requestId]
        );

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('federation acceptRequest error:', err);
        res.status(500).json({ success: false, message: 'Failed to accept federation request' });
    }
};

// ════════════════════════════════════════
// API 3: 연합 거절
// POST /api/federation/reject
// ════════════════════════════════════════
exports.rejectRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ success: false, message: 'requestId is required' });
        }

        const { rows: reqRows } = await db.query(
            'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
            [requestId, 'pending']
        );
        if (!reqRows.length) {
            return res.status(404).json({ success: false, message: '대기 중인 연합 요청이 없습니다' });
        }

        if (!await checkSiteOwner(userId, reqRows[0].target_site_id)) {
            return res.status(403).json({ success: false, message: '대상 사이트 오너만 거절할 수 있습니다' });
        }

        const { rows } = await db.query(
            `UPDATE federation_requests SET status = 'rejected', responder_id = $1, updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [userId, requestId]
        );

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('federation rejectRequest error:', err);
        res.status(500).json({ success: false, message: 'Failed to reject federation request' });
    }
};

// ════════════════════════════════════════
// API 4: 웜홀 조회 (특허 청구항 3번 핵심)
// GET /api/federation/resolve/:federationId/:nodeId
// ════════════════════════════════════════
exports.resolveNode = async (req, res) => {
    try {
        const { federationId, nodeId } = req.params;
        const federationJWT = req.headers['x-federation-token'];

        if (!federationJWT) {
            return res.status(401).json({ success: false, message: 'Federation JWT required (X-Federation-Token header)' });
        }

        // 연합 관계 조회
        const { rows: fedRows } = await db.query(
            'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
            [federationId, 'accepted']
        );
        if (!fedRows.length) {
            return res.status(404).json({ success: false, message: '승인된 연합 관계가 없습니다' });
        }
        const fed = fedRows[0];

        // JWT 검증: 소스 도메인의 공개키로 서명 확인
        let decoded;
        try {
            const usedNonces = fed.nonce_cache || [];
            decoded = verifyFederationJWT(federationJWT, fed.source_public_key, usedNonces);
        } catch (err) {
            return res.status(401).json({ success: false, message: `JWT 검증 실패: ${err.message}` });
        }

        // iss(발행자) 검증
        if (decoded.iss !== fed.source_domain) {
            return res.status(403).json({ success: false, message: 'JWT 발행자가 소스 도메인과 일치하지 않습니다' });
        }

        // scope 검증
        const requestedScope = decoded.scope || [];
        if (!validateScope(requestedScope, fed.agreed_scope)) {
            return res.status(403).json({ success: false, message: '요청 scope가 합의된 범위를 초과합니다' });
        }

        // nonce 저장 (재전송 공격 방지)
        const updatedNonces = [...(fed.nonce_cache || []), decoded.nonce].slice(-100);
        await db.query(
            'UPDATE federation_requests SET nonce_cache = $1 WHERE id = $2',
            [JSON.stringify(updatedNonces), federationId]
        );

        // 관계 타입별 데이터 범위 결정
        const targetSiteId = fed.target_site_id;
        const person = await getPersonData(nodeId, targetSiteId, fed.relation_type, fed.agreed_scope);

        if (!person) {
            return res.status(404).json({ success: false, message: '인물을 찾을 수 없습니다' });
        }

        // ── 체인 탐색: 대상 사이트에서 나가는 다른 accepted federation 조회 ──
        const visitedDomains = req.headers['x-chain-visited']
            ? req.headers['x-chain-visited'].split(',').map(d => d.trim())
            : [];
        visitedDomains.push(fed.source_domain); // 현재 소스 도메인도 방문 처리

        const outgoingWormholes = await getOutgoingWormholes(
            fed.target_site_id,
            fed.target_domain,
            visitedDomains,
            fed.agreed_scope
        );

        res.json({
            success: true,
            data: {
                person,
                federation: {
                    id: fed.id,
                    relationType: fed.relation_type,
                    sourceDomain: fed.source_domain,
                    targetDomain: fed.target_domain,
                    scope: fed.agreed_scope,
                },
                outgoingWormholes,
            },
        });
    } catch (err) {
        console.error('federation resolveNode error:', err);
        res.status(500).json({ success: false, message: 'Failed to resolve node' });
    }
};

// ════════════════════════════════════════
// API 5: Batch 조회
// POST /api/federation/resolve/batch
// ════════════════════════════════════════
exports.resolveBatch = async (req, res) => {
    try {
        const { federationId, nodeIds } = req.body;
        const federationJWT = req.headers['x-federation-token'];

        if (!federationJWT || !federationId || !nodeIds || !Array.isArray(nodeIds)) {
            return res.status(400).json({ success: false, message: 'federationId, nodeIds[], X-Federation-Token header required' });
        }

        if (nodeIds.length > 50) {
            return res.status(400).json({ success: false, message: 'Maximum 50 nodes per batch request' });
        }

        const { rows: fedRows } = await db.query(
            'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
            [federationId, 'accepted']
        );
        if (!fedRows.length) {
            return res.status(404).json({ success: false, message: '승인된 연합 관계가 없습니다' });
        }
        const fed = fedRows[0];

        let decoded;
        try {
            const usedNonces = fed.nonce_cache || [];
            decoded = verifyFederationJWT(federationJWT, fed.source_public_key, usedNonces);
        } catch (err) {
            return res.status(401).json({ success: false, message: `JWT 검증 실패: ${err.message}` });
        }

        if (decoded.iss !== fed.source_domain) {
            return res.status(403).json({ success: false, message: 'JWT 발행자 불일치' });
        }

        if (!validateScope(decoded.scope || [], fed.agreed_scope)) {
            return res.status(403).json({ success: false, message: 'Scope 초과' });
        }

        // nonce 저장
        const updatedNonces = [...(fed.nonce_cache || []), decoded.nonce].slice(-100);
        await db.query(
            'UPDATE federation_requests SET nonce_cache = $1 WHERE id = $2',
            [JSON.stringify(updatedNonces), federationId]
        );

        const results = [];
        for (const nid of nodeIds) {
            const person = await getPersonData(nid, fed.target_site_id, fed.relation_type, fed.agreed_scope);
            if (person) results.push(person);
        }

        res.json({ success: true, data: results });
    } catch (err) {
        console.error('federation resolveBatch error:', err);
        res.status(500).json({ success: false, message: 'Failed to resolve batch' });
    }
};

// ════════════════════════════════════════
// API 6: 연합 목록 조회
// GET /api/federation/list
// ════════════════════════════════════════
exports.listFederations = async (req, res) => {
    try {
        const userId = req.user.id;

        // 내가 오너인 사이트들의 연합 요청/응답 목록
        const { rows } = await db.query(
            `SELECT fr.*,
                    s1.subdomain as source_subdomain,
                    s2.subdomain as target_subdomain
             FROM federation_requests fr
             JOIN family_sites s1 ON fr.source_site_id = s1.id
             JOIN family_sites s2 ON fr.target_site_id = s2.id
             WHERE s1.user_id = $1 OR s2.user_id = $1
             ORDER BY fr.updated_at DESC`,
            [userId]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('federation listFederations error:', err);
        res.status(500).json({ success: false, message: 'Failed to list federations' });
    }
};

// ════════════════════════════════════════
// API 7: 페더레이션 JWT 발급 (소스 도메인용)
// POST /api/federation/token
// ════════════════════════════════════════
exports.generateToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { federationId } = req.body;

        if (!federationId) {
            return res.status(400).json({ success: false, message: 'federationId is required' });
        }

        const { rows: fedRows } = await db.query(
            'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
            [federationId, 'accepted']
        );
        if (!fedRows.length) {
            return res.status(404).json({ success: false, message: '승인된 연합 관계가 없습니다' });
        }
        const fed = fedRows[0];

        // 요청자가 소스 사이트 오너인지 확인
        if (!await checkSiteOwner(userId, fed.source_site_id)) {
            return res.status(403).json({ success: false, message: '소스 사이트 오너만 토큰을 발급할 수 있습니다' });
        }

        // 소스 도메인 개인키로 서명
        const keys = await getOrCreateDomainKeys(fed.source_site_id, fed.source_domain);
        const { token, nonce } = signFederationJWT(
            {
                iss: fed.source_domain,
                sub: `federation:${federationId}`,
                scope: fed.agreed_scope || [],
                targetDomain: fed.target_domain,
            },
            keys.privateKey
        );

        res.json({ success: true, data: { token, nonce, expiresIn: '5m' } });
    } catch (err) {
        console.error('federation generateToken error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate federation token' });
    }
};

// ════════════════════════════════════════
// API 8: 체인 탐색 (청구항 6 — 다중 도메인 순차 탐색)
// POST /api/federation/chain-resolve
// ════════════════════════════════════════
const MAX_CHAIN_HOPS = 5;

exports.chainResolve = async (req, res) => {
    try {
        const { chain } = req.body;
        const firstHopJWT = req.headers['x-federation-token'];

        if (!firstHopJWT) {
            return res.status(401).json({ success: false, message: 'X-Federation-Token header required' });
        }

        if (!Array.isArray(chain) || chain.length < 1) {
            return res.status(400).json({ success: false, message: 'chain[] is required (array of {federationId, nodeId})' });
        }

        if (chain.length > MAX_CHAIN_HOPS) {
            return res.status(400).json({ success: false, message: `최대 ${MAX_CHAIN_HOPS}홉까지 가능합니다` });
        }

        const visitedDomains = [];
        let currentJWT = firstHopJWT;
        let effectiveScope = null; // 첫 홉에서 설정됨
        const results = [];

        for (let i = 0; i < chain.length; i++) {
            const hop = chain[i];
            const { federationId, nodeId } = hop;

            // 연합 관계 조회
            const { rows: fedRows } = await db.query(
                'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
                [federationId, 'accepted']
            );
            if (!fedRows.length) {
                return res.status(404).json({
                    success: false,
                    message: `홉 ${i + 1}: 승인된 연합 관계가 없습니다 (federation ${federationId})`,
                });
            }
            const fed = fedRows[0];

            // 사이클 방지
            if (visitedDomains.includes(fed.target_domain)) {
                return res.status(400).json({
                    success: false,
                    message: `사이클 감지: ${fed.target_domain}은 이미 방문한 도메인입니다`,
                    visitedDomains,
                });
            }

            // JWT 검증 — 각 홉마다 독립 검증
            let decoded;
            try {
                const usedNonces = fed.nonce_cache || [];
                decoded = verifyFederationJWT(currentJWT, fed.source_public_key, usedNonces);
            } catch (err) {
                return res.status(401).json({
                    success: false,
                    message: `홉 ${i + 1}: JWT 검증 실패 — ${err.message}`,
                });
            }

            // iss 검증
            if (decoded.iss !== fed.source_domain) {
                return res.status(403).json({
                    success: false,
                    message: `홉 ${i + 1}: JWT 발행자(${decoded.iss})가 소스 도메인(${fed.source_domain})과 불일치`,
                });
            }

            // scope 검증 + 교집합 축소
            if (i === 0) {
                effectiveScope = [...(fed.agreed_scope || [])];
            } else {
                effectiveScope = intersectScopes(effectiveScope, fed.agreed_scope || []);
            }

            if (effectiveScope.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: `홉 ${i + 1}: scope 교집합이 비어 접근 가능한 데이터가 없습니다`,
                });
            }

            // nonce 저장
            const updatedNonces = [...(fed.nonce_cache || []), decoded.nonce].slice(-100);
            await db.query(
                'UPDATE federation_requests SET nonce_cache = $1 WHERE id = $2',
                [JSON.stringify(updatedNonces), federationId]
            );

            visitedDomains.push(fed.source_domain);

            // 인물 데이터 조회 (effectiveScope 적용)
            const person = await getPersonData(nodeId, fed.target_site_id, fed.relation_type, effectiveScope);
            if (!person) {
                return res.status(404).json({
                    success: false,
                    message: `홉 ${i + 1}: 인물(${nodeId})을 찾을 수 없습니다`,
                });
            }

            // 다음 홉이 있으면 중간 도메인에서 새 JWT 발급
            if (i < chain.length - 1) {
                const nextHop = chain[i + 1];
                const nextFedId = nextHop.federationId;

                // 중간 도메인의 private key로 다음 홉 JWT 서명
                const keys = await getOrCreateDomainKeys(fed.target_site_id, fed.target_domain);
                const { token: nextJWT } = signChainJWT(
                    {
                        iss: fed.target_domain,
                        sub: `federation:${nextFedId}`,
                        scope: effectiveScope,
                        targetDomain: chain[i + 1].targetDomain || '',
                    },
                    keys.privateKey,
                    visitedDomains
                );
                currentJWT = nextJWT;
            }

            // outgoing wormholes (마지막 홉에서만)
            const allVisited = [...visitedDomains, fed.target_domain];
            const outgoing = i === chain.length - 1
                ? await getOutgoingWormholes(fed.target_site_id, fed.target_domain, allVisited, effectiveScope)
                : [];

            results.push({
                hop: i + 1,
                person,
                federation: {
                    id: fed.id,
                    relationType: fed.relation_type,
                    sourceDomain: fed.source_domain,
                    targetDomain: fed.target_domain,
                },
                effectiveScope,
                outgoingWormholes: outgoing,
            });
        }

        res.json({
            success: true,
            data: {
                hops: results,
                visitedDomains: [...visitedDomains, results[results.length - 1]?.federation.targetDomain],
                totalHops: results.length,
            },
        });
    } catch (err) {
        console.error('federation chainResolve error:', err);
        res.status(500).json({ success: false, message: 'Failed to resolve chain' });
    }
};

// ════════════════════════════════════════
// 헬퍼: 대상 사이트에서 나가는 다른 웜홀 목록 (체인 탐색용)
// ════════════════════════════════════════
async function getOutgoingWormholes(siteId, currentDomain, visitedDomains, currentScope) {
    // 이 사이트가 source인 accepted federation 조회 (현재 도메인과 이미 방문한 도메인 제외)
    const { rows: outgoing } = await db.query(
        `SELECT id, target_domain, target_node_id, relation_type, agreed_scope
         FROM federation_requests
         WHERE source_site_id = $1 AND status = 'accepted'`,
        [siteId]
    );

    return outgoing
        .filter(f => !visitedDomains.includes(f.target_domain) && f.target_domain !== currentDomain)
        .map(f => ({
            federationId: f.id,
            targetDomain: f.target_domain,
            targetNodeId: f.target_node_id,
            relationType: f.relation_type,
            scope: intersectScopes(currentScope, f.agreed_scope || []),
        }))
        .filter(f => f.scope.length > 0); // scope 교집합이 빈 배열이면 제외
}

// ════════════════════════════════════════
// 헬퍼: 관계 타입별 인물 데이터 조회
// ════════════════════════════════════════
async function getPersonData(nodeId, siteId, relationType, agreedScope) {
    const { rows } = await db.query(
        `SELECT id, site_id, name, birth_year, death_year, gender,
                privacy_level, generation, photo_url, birth_date, death_date
         FROM persons WHERE id = $1 AND site_id = $2`,
        [nodeId, siteId]
    );
    if (!rows.length) return null;
    const person = rows[0];

    // 관계 타입에 따른 데이터 필터링
    const scopes = agreedScope || [];
    const result = {
        id: person.id,
        name: person.name,
        gender: person.gender,
        generation: person.generation,
    };

    // profile scope — 기본 프로필 정보
    if (scopes.includes('profile')) {
        result.birth_year = person.birth_year;
        result.birth_date = person.birth_date;
        result.death_year = person.death_year;
        result.death_date = person.death_date;
        result.photo_url = person.photo_url;
    }

    // photos.public scope — 공개 사진 메타데이터
    if (scopes.includes('photos.public')) {
        const { rows: publicPhotos } = await db.query(
            `SELECT sm.id, sm.filename, sm.media_type, sm.thumbnail_url, sm.title
             FROM site_media sm
             JOIN site_folders sf ON sm.folder_id = sf.id
             WHERE sf.site_id = $1 AND sf.is_shared = true`,
            [siteId]
        );
        result.publicPhotos = publicPhotos;
    }

    // photos.family scope — 가족 공유 사진 (직계 전용)
    if (scopes.includes('photos.family') && relationType === 'direct') {
        const { rows: familyPhotos } = await db.query(
            `SELECT sm.id, sm.filename, sm.media_type, sm.thumbnail_url, sm.title
             FROM site_media sm
             JOIN site_folders sf ON sm.folder_id = sf.id
             WHERE sf.site_id = $1`,
            [siteId]
        );
        result.familyPhotos = familyPhotos;
    }

    // exhibitions scope — 전시회 목록
    if (scopes.includes('exhibitions')) {
        const visFilter = relationType === 'direct' ? '' : "AND visibility = 'public'";
        const { rows: exhibitions } = await db.query(
            `SELECT id, title, description, cover_photo, photo_count, visibility
             FROM exhibitions WHERE site_id = $1 ${visFilter}
             ORDER BY created_at DESC LIMIT 20`,
            [siteId]
        );
        result.exhibitions = exhibitions;
    }

    return result;
}
