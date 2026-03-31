const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// RSA-2048 키쌍 생성
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
}

// 페더레이션 JWT 서명 (RS256)
function signFederationJWT(payload, privateKey) {
    const nonce = generateNonce();
    const tokenPayload = {
        ...payload,
        nonce,
        iat: Math.floor(Date.now() / 1000),
    };
    const token = jwt.sign(tokenPayload, privateKey, {
        algorithm: 'RS256',
        expiresIn: '5m',
    });
    return { token, nonce };
}

// 페더레이션 JWT 검증
function verifyFederationJWT(token, publicKey, usedNonces = []) {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

    // nonce 재사용 체크 (재전송 공격 방지)
    if (usedNonces.includes(decoded.nonce)) {
        throw new Error('Nonce already used — replay attack detected');
    }

    // 만료 체크 (jwt.verify가 자동으로 하지만 명시적 확인)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
        throw new Error('Token expired');
    }

    return decoded;
}

// scope 검증: 요청된 scope가 합의된 scope 내에 있는지 확인
function validateScope(requestedScope, agreedScope) {
    if (!Array.isArray(agreedScope) || agreedScope.length === 0) return false;
    if (!Array.isArray(requestedScope)) requestedScope = [requestedScope];
    return requestedScope.every(s => agreedScope.includes(s));
}

// 체인 탐색용: 두 scope 배열의 교집합 (각 홉마다 scope 축소)
function intersectScopes(scopeA, scopeB) {
    if (!Array.isArray(scopeA) || !Array.isArray(scopeB)) return [];
    return scopeA.filter(s => scopeB.includes(s));
}

// 체인 탐색용 JWT 서명 — chain 경로 포함
function signChainJWT(payload, privateKey, visitedDomains = []) {
    const nonce = generateNonce();
    const tokenPayload = {
        ...payload,
        nonce,
        chain: visitedDomains,
        iat: Math.floor(Date.now() / 1000),
    };
    const token = jwt.sign(tokenPayload, privateKey, {
        algorithm: 'RS256',
        expiresIn: '5m',
    });
    return { token, nonce };
}

// 1회용 난수 생성
function generateNonce() {
    return crypto.randomBytes(16).toString('hex');
}

// 개인키 암호화 (서버 저장용)
function encryptPrivateKey(privateKey) {
    const secret = process.env.FEDERATION_ENCRYPT_KEY || process.env.JWT_SECRET;
    if (!secret) throw new Error('Encryption key not configured');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(secret, 'salt', 32), iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// 개인키 복호화
function decryptPrivateKey(encryptedKey) {
    const secret = process.env.FEDERATION_ENCRYPT_KEY || process.env.JWT_SECRET;
    if (!secret) throw new Error('Encryption key not configured');
    const [ivHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(secret, 'salt', 32), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    generateKeyPair,
    signFederationJWT,
    signChainJWT,
    verifyFederationJWT,
    validateScope,
    intersectScopes,
    generateNonce,
    encryptPrivateKey,
    decryptPrivateKey,
};
