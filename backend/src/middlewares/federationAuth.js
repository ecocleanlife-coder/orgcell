/**
 * Federation JWT validation middleware with Scope Escalation and Replay prevention.
 * Two variants: federationAuth (full validation) and chainFederationAuth (lightweight).
 */

const db = require('../config/db');
const {
    verifyFederationJWT,
    intersectScopes,
} = require('../utils/federationJWT');
const nonceCache = require('../utils/nonceCache');

const DEFAULT_SCOPES = {
    direct: ['profile', 'photos.public', 'photos.family', 'exhibitions'],
    collateral: ['profile', 'photos.public'],
    spouse: ['profile', 'photos.public', 'exhibitions'],
};

/**
 * Full federation JWT validation middleware for resolveNode and resolveBatch.
 * Performs:
 * 1. Token presence check
 * 2. Federation lookup
 * 3. JWT signature verification
 * 4. Replay attack detection (nonce)
 * 5. Issuer validation
 * 6. Scope Escalation (intersection with relation type defaults)
 */
exports.federationAuth = async (req, res, next) => {
    try {
        // Extract token from header
        const token = req.headers['x-federation-token'];
        if (!token) {
            return res.status(401).json({ success: false, message: 'X-Federation-Token header required' });
        }

        // Extract federationId from params or body
        let federationId = req.params.federationId;
        if (!federationId && req.body) {
            federationId = req.body.federationId;
        }
        if (!federationId) {
            return res.status(400).json({ success: false, message: 'federationId required' });
        }

        // Query federation
        const { rows: fedRows } = await db.query(
            'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
            [federationId, 'accepted']
        );
        if (!fedRows.length) {
            return res.status(404).json({ success: false, message: 'Accepted federation not found' });
        }
        const fed = fedRows[0];

        // Verify JWT
        let decoded;
        try {
            decoded = verifyFederationJWT(token, fed.source_public_key, []);
        } catch (err) {
            return res.status(401).json({ success: false, message: `JWT verification failed: ${err.message}` });
        }

        // Replay attack check
        if (nonceCache.add(decoded.nonce)) {
            return res.status(401).json({
                success: false,
                message: 'Nonce replay detected — replay attack blocked',
            });
        }

        // Issuer validation
        if (decoded.iss !== fed.source_domain) {
            return res.status(403).json({
                success: false,
                message: `JWT issuer mismatch: ${decoded.iss} vs ${fed.source_domain}`,
            });
        }

        // Scope Escalation: enforce relation_type defaults
        const maxAllowedScope = DEFAULT_SCOPES[fed.relation_type] || DEFAULT_SCOPES.collateral;
        const effectiveScope = intersectScopes(
            intersectScopes(decoded.scope || [], maxAllowedScope),
            fed.agreed_scope || []
        );

        if (effectiveScope.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No effective scope available',
            });
        }

        // Attach federation and claims to request
        req.federation = fed;
        req.federationClaims = {
            ...decoded,
            effectiveScope,
        };

        next();
    } catch (err) {
        console.error('federationAuth middleware error:', err);
        res.status(500).json({ success: false, message: 'Federation authentication failed' });
    }
};

/**
 * Lightweight federation JWT validation for chainResolve.
 * Only checks token presence and validates chain structure.
 * Per-hop verification happens in the service layer.
 */
exports.chainFederationAuth = async (req, res, next) => {
    try {
        // Check token presence
        const token = req.headers['x-federation-token'];
        if (!token) {
            return res.status(401).json({ success: false, message: 'X-Federation-Token header required' });
        }

        // Validate chain array
        const { chain } = req.body;
        if (!Array.isArray(chain)) {
            return res.status(400).json({ success: false, message: 'chain[] must be an array' });
        }
        if (chain.length < 1 || chain.length > 5) {
            return res.status(400).json({ success: false, message: 'chain[] must have 1-5 elements' });
        }

        // Attach token to request for service layer
        req.initialFederationJWT = token;

        next();
    } catch (err) {
        console.error('chainFederationAuth middleware error:', err);
        res.status(500).json({ success: false, message: 'Chain federation authentication failed' });
    }
};
