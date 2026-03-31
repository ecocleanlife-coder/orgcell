const request = require('supertest');

const mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args) }));

const express = require('express');
const app = express();
app.use(express.json());

const mockUser = { id: 1, email: 'test@test.com' };
const protect = (req, res, next) => { req.user = mockUser; next(); };

const ctrl = require('../controllers/federationController');
const router = express.Router();
router.post('/request', protect, ctrl.createRequest);
router.post('/accept', protect, ctrl.acceptRequest);
router.post('/reject', protect, ctrl.rejectRequest);
router.get('/list', protect, ctrl.listFederations);
router.post('/token', protect, ctrl.generateToken);
router.get('/resolve/:federationId/:nodeId', ctrl.resolveNode);
router.post('/resolve/batch', ctrl.resolveBatch);
router.post('/chain-resolve', ctrl.chainResolve);
app.use('/api/federation', router);

// federationJWT 유닛 테스트
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
        // 첫 번째 사용: 성공
        verifyFederationJWT(token, keys.publicKey, []);
        // 두 번째 사용: nonce 이미 사용됨 → 에러
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
        // 합의된 scope: profile + photos.public
        // 요청 scope: profile + photos.family (unauthorized)
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

describe('Federation API', () => {
    beforeEach(() => {
        mockQuery.mockReset();
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
            // getOrCreateDomainKeys → existing
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
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, target_site_id: 2, target_domain: 'lee', relation_type: 'direct' }] });
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
            // nonce update
            mockQuery.mockResolvedValueOnce({ rows: [] });
            // getPersonData — base person query
            mockQuery.mockResolvedValueOnce({
                rows: [{ id: 100, site_id: 2, name: 'Person B', gender: 'M', generation: 1 }],
            });
            // getPersonData — photos.public query (scope includes 'photos.public')
            mockQuery.mockResolvedValueOnce({ rows: [] });
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
            expect(res.body.message).toContain('사이클');
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
