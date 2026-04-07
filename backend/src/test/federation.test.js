const request = require('supertest');

const mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args) }));

const express = require('express');
const app = express();
app.use(express.json());

const mockUser = { id: 1, email: 'test@test.com' };
const protect = (req, res, next) => { req.user = mockUser; next(); };

const ctrl = require('../controllers/federationController');
const { federationAuth, chainFederationAuth } = require('../middlewares/federationAuth');
const router = express.Router();
router.post('/request', protect, ctrl.createRequest);
router.post('/accept', protect, ctrl.acceptRequest);
router.post('/reject', protect, ctrl.rejectRequest);
router.get('/list', protect, ctrl.listFederations);
router.post('/token', protect, ctrl.generateToken);
router.get('/resolve/:federationId/:nodeId', federationAuth, ctrl.resolveNode);
router.post('/resolve/batch', federationAuth, ctrl.resolveBatch);
router.post('/chain-resolve', chainFederationAuth, ctrl.chainResolve);
app.use('/api/federation', router);

// ════════════════════════════════════════════
// Utils
// ════════════════════════════════════════════

const {
    generateKeyPair,
    signFederationJWT,
    signChainJWT,
    verifyFederationJWT,
    validateScope,
    intersectScopes,
    generateNonce,
    encryptPrivateKey,
    decryptPrivateKey,
} = require('../utils/federationJWT');

const nonceCache = require('../utils/nonceCache');
const metaCache = require('../utils/metaCache');

// ════════════════════════════════════════════
// SUITE: Federation JWT Utils
// ════════════════════════════════════════════

describe('Federation JWT Utils', () => {
    let keys;

    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret-key-for-federation-tests';
        keys = generateKeyPair();
    });

    it('should generate RSA key pair', () => {
        expect(keys.publicKey).toContain('BEGIN PUBLIC KEY');
        expect(keys.privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('should sign and verify federation JWT', () => {
        const { token } = signFederationJWT(
            { iss: 'test-domain', sub: 'federation:1', scope: ['profile'] },
            keys.privateKey
        );
        const decoded = verifyFederationJWT(token, keys.publicKey, []);
        expect(decoded.iss).toBe('test-domain');
        expect(decoded.scope).toEqual(['profile']);
        expect(decoded.nonce).toBeTruthy();
    });

    it('should reject nonce reuse (replay attack prevention)', () => {
        const { token, nonce } = signFederationJWT(
            { iss: 'test-domain', sub: 'test', scope: ['profile'] },
            keys.privateKey
        );
        // First use: success
        verifyFederationJWT(token, keys.publicKey, []);
        // Second use: nonce already used → error
        expect(() => {
            verifyFederationJWT(token, keys.publicKey, [nonce]);
        }).toThrow('Nonce already used');
    });

    it('should reject token signed with wrong key', () => {
        const otherKeys = generateKeyPair();
        const { token } = signFederationJWT(
            { iss: 'attacker', sub: 'test', scope: ['profile'] },
            otherKeys.privateKey
        );
        expect(() => {
            verifyFederationJWT(token, keys.publicKey, []);
        }).toThrow();
    });

    it('should validate scope correctly', () => {
        expect(validateScope(['profile'], ['profile', 'photos.public'])).toBe(true);
        expect(validateScope(['profile', 'photos.public'], ['profile', 'photos.public'])).toBe(true);
        expect(validateScope(['photos.family'], ['profile', 'photos.public'])).toBe(false);
        expect(validateScope(['admin'], [])).toBe(false);
    });

    it('should reject scope escalation', () => {
        // Agreed scope: profile + photos.public
        // Requested scope: profile + photos.family (unauthorized)
        expect(validateScope(
            ['profile', 'photos.family'],
            ['profile', 'photos.public']
        )).toBe(false);
    });

    it('should generate unique nonces', () => {
        const n1 = generateNonce();
        const n2 = generateNonce();
        expect(n1).not.toBe(n2);
        expect(n1).toHaveLength(32); // 16 bytes hex
    });

    it('should encrypt and decrypt private key', () => {
        const encrypted = encryptPrivateKey(keys.privateKey);
        expect(encrypted).toContain(':');
        const decrypted = decryptPrivateKey(encrypted);
        expect(decrypted).toBe(keys.privateKey);
    });

    it('should intersect scopes correctly', () => {
        expect(intersectScopes(
            ['profile', 'photos.public', 'photos.family'],
            ['profile', 'photos.public', 'exhibitions']
        )).toEqual(['profile', 'photos.public']);

        expect(intersectScopes(['profile'], ['exhibitions'])).toEqual([]);
        expect(intersectScopes([], ['profile'])).toEqual([]);
        expect(intersectScopes(null, ['profile'])).toEqual([]);
    });

    it('should sign and verify chain JWT with visited domains', () => {
        const { token } = signChainJWT(
            { iss: 'b-family', sub: 'federation:2', scope: ['profile'] },
            keys.privateKey,
            ['a-family']
        );
        const decoded = verifyFederationJWT(token, keys.publicKey, []);
        expect(decoded.iss).toBe('b-family');
        expect(decoded.chain).toEqual(['a-family']);
        expect(decoded.nonce).toBeTruthy();
    });
});

// ════════════════════════════════════════════
// SUITE: NonceCache
// ════════════════════════════════════════════

describe('NonceCache', () => {
    beforeEach(() => {
        nonceCache.clear();
    });

    it('should add new nonce and return false (not replay)', () => {
        const nonce = 'test-nonce-123';
        expect(nonceCache.add(nonce)).toBe(false);
    });

    it('should detect replay when same nonce is added twice', () => {
        const nonce = 'test-nonce-replay';
        expect(nonceCache.add(nonce)).toBe(false); // First use
        expect(nonceCache.add(nonce)).toBe(true); // Replay detected
    });

    it('should check if nonce exists', () => {
        const nonce = 'test-nonce-exists';
        nonceCache.add(nonce);
        expect(nonceCache.has(nonce)).toBe(true);
    });

    it('should return false for non-existent nonce', () => {
        expect(nonceCache.has('non-existent')).toBe(false);
    });

    it('should clear cache', () => {
        nonceCache.add('nonce-1');
        nonceCache.add('nonce-2');
        nonceCache.clear();
        expect(nonceCache.has('nonce-1')).toBe(false);
        expect(nonceCache.has('nonce-2')).toBe(false);
    });
});

// ════════════════════════════════════════════
// SUITE: MetaCache
// ════════════════════════════════════════════

describe('MetaCache', () => {
    beforeEach(() => {
        metaCache.clear();
    });

    it('should set and get data within TTL', () => {
        const key = 'test-key';
        const data = { name: 'John', age: 30 };
        metaCache.set(key, data);
        expect(metaCache.get(key)).toEqual(data);
    });

    it('should return null for missing key', () => {
        expect(metaCache.get('missing-key')).toBeNull();
    });

    it('should invalidate single entry', () => {
        const key = 'test-key';
        metaCache.set(key, { name: 'John' });
        metaCache.invalidate(key);
        expect(metaCache.get(key)).toBeNull();
    });

    it('should invalidate pattern', () => {
        metaCache.set('person:1:100', { id: 100 });
        metaCache.set('person:1:101', { id: 101 });
        metaCache.set('person:2:200', { id: 200 });
        metaCache.invalidatePattern('person:1:');
        expect(metaCache.get('person:1:100')).toBeNull();
        expect(metaCache.get('person:1:101')).toBeNull();
        expect(metaCache.get('person:2:200')).toEqual({ id: 200 });
    });

    it('should clear all entries', () => {
        metaCache.set('key1', { data: 1 });
        metaCache.set('key2', { data: 2 });
        metaCache.clear();
        expect(metaCache.get('key1')).toBeNull();
        expect(metaCache.get('key2')).toBeNull();
    });
});

// ════════════════════════════════════════════
// SUITE: Federation API
// ════════════════════════════════════════════

describe('Federation API', () => {
    beforeEach(() => {
        mockQuery.mockReset();
        nonceCache.clear();
        metaCache.clear();
    });

    describe('POST /api/federation/request', () => {
        it('should require targetDomain, sourceSiteId, relationType', async () => {
            const res = await request(app)
                .post('/api/federation/request')
                .send({ targetDomain: 'lee-family' });
            expect(res.status).toBe(400);
        });

        it('should reject invalid relationType', async () => {
            const res = await request(app)
                .post('/api/federation/request')
                .send({ targetDomain: 'lee', sourceSiteId: 1, relationType: 'invalid' });
            expect(res.status).toBe(400);
        });

        it('should block non-owner', async () => {
            // checkSiteOwner → no rows
            mockQuery.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .post('/api/federation/request')
                .send({ targetDomain: 'lee', sourceSiteId: 1, relationType: 'direct' });
            expect(res.status).toBe(403);
        });

        it('should create federation request successfully', async () => {
            // checkSiteOwner
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // source subdomain
            mockQuery.mockResolvedValueOnce({ rows: [{ subdomain: 'kim-family' }] });
            // findSiteByDomain (target)
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, user_id: 2, subdomain: 'lee-family' }] });
            // check existing
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // getOrCreate — no existing
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // INSERT domain_public_keys
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // INSERT federation_requests
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'pending' }] });

            const res = await request(app)
                .post('/api/federation/request')
                .send({ targetDomain: 'lee-family', sourceSiteId: 1, relationType: 'direct' });
            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe('pending');
        });

        it('should prevent self-federation', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // owner
            mockQuery.mockResolvedValueOnce({ rows: [{ subdomain: 'kim' }] }); // source domain
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, subdomain: 'kim' }] }); // target = same
            const res = await request(app)
                .post('/api/federation/request')
                .send({ targetDomain: 'kim', sourceSiteId: 1, relationType: 'direct' });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/federation/accept', () => {
        it('should require requestId', async () => {
            const res = await request(app).post('/api/federation/accept').send({});
            expect(res.status).toBe(400);
        });

        it('should block non-owner of target site', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, target_site_id: 2, target_domain: 'lee', relation_type: 'direct' }],
            });
            mockQuery.mockResolvedValueOnce({ rows: [] }); // not owner
            const res = await request(app)
                .post('/api/federation/accept')
                .send({ requestId: 1 });
            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/federation/reject', () => {
        it('should reject pending request', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, target_site_id: 2 }] }); // pending request
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] }); // owner check
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'rejected' }] }); // update
            const res = await request(app)
                .post('/api/federation/reject')
                .send({ requestId: 1 });
            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/federation/resolve/:federationId/:nodeId', () => {
        it('should require X-Federation-Token header', async () => {
            const res = await request(app).get('/api/federation/resolve/1/1');
            expect(res.status).toBe(401);
        });

        it('should reject token with wrong public key', async () => {
            const attackerKeys = generateKeyPair();
            const realKeys = generateKeyPair();
            const { token } = signFederationJWT(
                { iss: 'attacker', scope: ['profile'] },
                attackerKeys.privateKey
            );
            // federation query
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_public_key: realKeys.publicKey,
                    source_domain: 'kim',
                    target_site_id: 2,
                    relation_type: 'direct',
                    agreed_scope: ['profile'],
                    nonce_cache: [],
                }],
            });
            const res = await request(app)
                .get('/api/federation/resolve/1/1')
                .set('X-Federation-Token', token);
            expect(res.status).toBe(401);
        });
    });

    describe('federationAuth middleware — Scope Escalation', () => {
        it('should strip unauthorized scopes but allow valid intersection (collateral)', async () => {
            // JWT claims profile + photos.public + photos.family (3 scopes)
            // collateral relation only allows profile + photos.public
            // Expected: request succeeds with reduced scope (photos.family stripped)
            const keys = generateKeyPair();
            const { token } = signFederationJWT(
                {
                    iss: 'requester-family',
                    sub: 'federation:1',
                    scope: ['profile', 'photos.public', 'photos.family'],
                },
                keys.privateKey
            );

            // Federation: collateral — photos.family NOT in default scope
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_domain: 'requester-family',
                    source_public_key: keys.publicKey,
                    target_site_id: 2,
                    relation_type: 'collateral',
                    agreed_scope: ['profile', 'photos.public'],
                }],
            });
            // getPersonData: base person query
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, site_id: 2, name: 'Test Person', gender: 'M', generation: 1 }],
            });
            // getPersonData: photos.public shared folders query
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // getOutgoingWormholes: accepted federations from target site
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/federation/resolve/1/1')
                .set('X-Federation-Token', token);

            // Succeeds: effective scope = ['profile', 'photos.public'] (photos.family stripped)
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should block request with no effective scope', async () => {
            const keys = generateKeyPair();
            const { token } = signFederationJWT(
                {
                    iss: 'attacker-family',
                    sub: 'federation:1',
                    scope: ['photos.family', 'exhibitions'],
                },
                keys.privateKey
            );

            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_domain: 'attacker-family',
                    source_public_key: keys.publicKey,
                    target_site_id: 2,
                    relation_type: 'collateral',
                    agreed_scope: ['profile', 'photos.public'],
                }],
            });

            const res = await request(app)
                .get('/api/federation/resolve/1/1')
                .set('X-Federation-Token', token);

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('No effective scope');
        });
    });

    describe('Replay Attack Prevention', () => {
        it('should block replayed JWT within nonce TTL window', async () => {
            nonceCache.clear();
            const keys = generateKeyPair();
            const { token, nonce } = signFederationJWT(
                { iss: 'kim-family', sub: 'federation:1', scope: ['profile'] },
                keys.privateKey
            );

            // First use
            expect(nonceCache.add(nonce)).toBe(false);

            // Second use — replay
            expect(nonceCache.add(nonce)).toBe(true);
        });

        it('should reject replayed federation request', async () => {
            nonceCache.clear();
            const keys = generateKeyPair();
            const { token } = signFederationJWT(
                { iss: 'kim-family', sub: 'federation:1', scope: ['profile'] },
                keys.privateKey
            );

            // First request
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_domain: 'kim-family',
                    source_public_key: keys.publicKey,
                    target_site_id: 2,
                    relation_type: 'direct',
                    agreed_scope: ['profile'],
                }],
            });
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, site_id: 2, name: 'Person', gender: 'M', generation: 1 }] });

            // getOutgoingWormholes for first request
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res1 = await request(app)
                .get('/api/federation/resolve/1/1')
                .set('X-Federation-Token', token);
            expect(res1.status).toBe(200);

            // Second request with same nonce — should be blocked
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_domain: 'kim-family',
                    source_public_key: keys.publicKey,
                    target_site_id: 2,
                    relation_type: 'direct',
                    agreed_scope: ['profile'],
                }],
            });

            const res2 = await request(app)
                .get('/api/federation/resolve/1/1')
                .set('X-Federation-Token', token);
            expect(res2.status).toBe(401);
            expect(res2.body.message).toContain('replay');
        });
    });

    describe('Tampered Relation Information', () => {
        it('should use DB relation_type, not JWT payload (blocks type escalation)', async () => {
            // Attacker embeds relation_type: 'direct' in JWT payload
            // hoping to gain photos.family access via a collateral federation
            const keys = generateKeyPair();
            const { token } = signFederationJWT(
                {
                    iss: 'attacker-family',
                    sub: 'federation:1',
                    scope: ['profile', 'photos.public', 'photos.family'],
                    relation_type: 'direct', // Tampered claim — attacker claims direct
                },
                keys.privateKey
            );

            // DB truth: relation_type is 'collateral', not 'direct'
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_domain: 'attacker-family',
                    source_public_key: keys.publicKey,
                    target_site_id: 2,
                    relation_type: 'collateral', // DB-backed truth
                    agreed_scope: ['profile', 'photos.public'],
                }],
            });
            // getPersonData: person (scope will be ['profile','photos.public'] — photos.family stripped)
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 1, site_id: 2, name: 'Test', gender: 'M', generation: 1 }],
            });
            // getPersonData: photos.public shared folders
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // getOutgoingWormholes
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/federation/resolve/1/1')
                .set('X-Federation-Token', token);

            // Succeeds but with collateral scope — JWT payload relation_type is IGNORED
            expect(res.status).toBe(200);
            // Response contains no familyPhotos (photos.family was stripped by DB relation_type)
            expect(res.body.data.person.familyPhotos).toBeUndefined();
        });

        it('should return 403 when attacker JWT scope has zero intersection with collateral default', async () => {
            // Attacker sends only 'photos.family' + 'exhibitions' — neither in collateral default
            const keys = generateKeyPair();
            const { token } = signFederationJWT(
                {
                    iss: 'attacker-family',
                    sub: 'federation:1',
                    scope: ['photos.family', 'exhibitions'],
                    relation_type: 'direct',
                },
                keys.privateKey
            );

            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_domain: 'attacker-family',
                    source_public_key: keys.publicKey,
                    target_site_id: 2,
                    relation_type: 'collateral',
                    agreed_scope: ['profile', 'photos.public'],
                }],
            });

            const res = await request(app)
                .get('/api/federation/resolve/1/1')
                .set('X-Federation-Token', token);

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('No effective scope');
        });

        it('should block batch resolve with empty nodeIds array', async () => {
            const keys = generateKeyPair();
            const { token } = signFederationJWT(
                { iss: 'kim-family', sub: 'federation:1', scope: ['profile'] },
                keys.privateKey
            );

            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_domain: 'kim-family',
                    source_public_key: keys.publicKey,
                    target_site_id: 2,
                    relation_type: 'direct',
                    agreed_scope: ['profile'],
                }],
            });

            const res = await request(app)
                .post('/api/federation/resolve/batch')
                .set('X-Federation-Token', token)
                .send({ federationId: 1, nodeIds: [] });

            // Empty array is valid (returns empty results), but > 50 is not
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it('should block batch resolve exceeding 50 nodes', async () => {
            const keys = generateKeyPair();
            const { token } = signFederationJWT(
                { iss: 'kim-family', sub: 'federation:1', scope: ['profile'] },
                keys.privateKey
            );

            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    source_domain: 'kim-family',
                    source_public_key: keys.publicKey,
                    target_site_id: 2,
                    relation_type: 'direct',
                    agreed_scope: ['profile'],
                }],
            });

            const nodeIds = Array.from({ length: 51 }, (_, i) => i + 1);
            const res = await request(app)
                .post('/api/federation/resolve/batch')
                .set('X-Federation-Token', token)
                .send({ federationId: 1, nodeIds });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('50');
        });
    });

    describe('POST /api/federation/chain-resolve', () => {
        it('should require X-Federation-Token header', async () => {
            const res = await request(app)
                .post('/api/federation/chain-resolve')
                .send({ chain: [{ federationId: 1, nodeId: 1 }] });
            expect(res.status).toBe(401);
        });

        it('should require chain array', async () => {
            const res = await request(app)
                .post('/api/federation/chain-resolve')
                .set('X-Federation-Token', 'some-token')
                .send({});
            expect(res.status).toBe(400);
        });

        it('should reject chain exceeding max hops', async () => {
            const chain = Array.from({ length: 6 }, (_, i) => ({
                federationId: i + 1,
                nodeId: i + 100,
            }));
            const res = await request(app)
                .post('/api/federation/chain-resolve')
                .set('X-Federation-Token', 'some-token')
                .send({ chain });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('5');
        });

        it('should detect cycle in chain', async () => {
            const keysA = generateKeyPair();
            const keysB = generateKeyPair();

            // Hop 1: A→B
            const { token: jwt1 } = signFederationJWT(
                { iss: 'a-family', sub: 'federation:1', scope: ['profile'] },
                keysA.privateKey
            );

            // federation 1: A→B (accepted)
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 1, source_site_id: 1, target_site_id: 2,
                    source_domain: 'a-family', target_domain: 'b-family',
                    source_public_key: keysA.publicKey,
                    relation_type: 'direct',
                    agreed_scope: ['profile', 'photos.public'],
                    nonce_cache: [],
                }],
            });
            // getPersonData — base person query (scope=['profile'] only, no photos.public query)
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 100, site_id: 2, name: 'Person B', gender: 'M', generation: 1 }],
            });
            // getOrCreateDomainKeys for B
            mockQuery.mockResolvedValueOnce({ rows: [] }); // no existing key
            mockQuery.mockResolvedValueOnce({ rows: [] }); // insert key

            // federation 2: B→A (cycle!)
            mockQuery.mockResolvedValueOnce({
                rows: [{
                    id: 2, source_site_id: 2, target_site_id: 1,
                    source_domain: 'b-family', target_domain: 'a-family',
                    source_public_key: keysB.publicKey,
                    relation_type: 'collateral',
                    agreed_scope: ['profile'],
                    nonce_cache: [],
                }],
            });

            const res = await request(app)
                .post('/api/federation/chain-resolve')
                .set('X-Federation-Token', jwt1)
                .send({
                    chain: [
                        { federationId: 1, nodeId: 100 },
                        { federationId: 2, nodeId: 50 },
                    ],
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Cycle');
        });
    });

    describe('GET /api/federation/list', () => {
        it('should return federation list', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { id: 1, source_domain: 'kim', target_domain: 'lee', status: 'accepted' },
                ],
            });
            const res = await request(app).get('/api/federation/list');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
});
