/**
 * Federation service layer: business logic for federation requests, token generation, and data resolution.
 * Extracted from controller to enable middleware reuse and testing.
 */

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
const keyResolver = require('../utils/keyResolver');
const nonceCache = require('../utils/nonceCache');
const metaCache = require('../utils/metaCache');

// ── Relationship type default scopes ──
const DEFAULT_SCOPES = {
    direct: ['profile', 'photos.public', 'photos.family', 'exhibitions'],
    collateral: ['profile', 'photos.public'],
    spouse: ['profile', 'photos.public', 'exhibitions'],
};

// ────────────────────────────────────────
// HELPER: Site owner check
// ────────────────────────────────────────

async function checkSiteOwner(userId, siteId) {
    const { rows } = await db.query(
        'SELECT id FROM family_sites WHERE id = $1 AND user_id = $2',
        [siteId, userId]
    );
    return rows.length > 0;
}

// ────────────────────────────────────────
// HELPER: Find site by domain
// ────────────────────────────────────────

async function findSiteByDomain(domain) {
    const { rows } = await db.query(
        'SELECT id, user_id, subdomain FROM family_sites WHERE subdomain = $1',
        [domain]
    );
    return rows[0] || null;
}

// ────────────────────────────────────────
// HELPER: Get person data with scope filtering
// ────────────────────────────────────────

async function getPersonData(nodeId, siteId, relationType, agreedScope) {
    const { rows } = await db.query(
        `SELECT id, site_id, name, birth_year, death_year, gender,
                privacy_level, generation, photo_url, birth_date, death_date
         FROM persons WHERE id = $1 AND site_id = $2`,
        [nodeId, siteId]
    );
    if (!rows.length) return null;
    const person = rows[0];

    // Scope-based data filtering
    const scopes = agreedScope || [];
    const result = {
        id: person.id,
        name: person.name,
        gender: person.gender,
        generation: person.generation,
    };

    // profile scope — basic profile info
    if (scopes.includes('profile')) {
        result.birth_year = person.birth_year;
        result.birth_date = person.birth_date;
        result.death_year = person.death_year;
        result.death_date = person.death_date;
        result.photo_url = person.photo_url;
    }

    // photos.public scope — public shared photos
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

    // photos.family scope — family-only photos (direct relations only)
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

    // exhibitions scope — exhibition list
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

// ────────────────────────────────────────
// HELPER: Get outgoing wormholes
// ────────────────────────────────────────

async function getOutgoingWormholes(siteId, currentDomain, visitedDomains, currentScope) {
    // Find all outgoing federations from this site that are accepted
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
        .filter(f => f.scope.length > 0); // Filter out empty scope intersections
}

// ────────────────────────────────────────
// API 1: Create federation request
// ────────────────────────────────────────

exports.requestFederation = async (userId, {
    targetDomain,
    sourceSiteId,
    sourceNodeId,
    targetNodeId,
    relationType,
}) => {
    // Validate input
    if (!targetDomain || !sourceSiteId || !relationType) {
        const err = new Error('targetDomain, sourceSiteId, relationType are required');
        err.status = 400;
        throw err;
    }

    const validTypes = ['direct', 'collateral', 'spouse'];
    if (!validTypes.includes(relationType)) {
        const err = new Error(`Invalid relationType. Must be: ${validTypes.join(', ')}`);
        err.status = 400;
        throw err;
    }

    // Check site owner
    if (!await checkSiteOwner(userId, sourceSiteId)) {
        const err = new Error('Only site owner can request federation');
        err.status = 403;
        throw err;
    }

    // Get source domain
    const { rows: siteRows } = await db.query(
        'SELECT subdomain FROM family_sites WHERE id = $1',
        [sourceSiteId]
    );
    if (!siteRows.length) {
        const err = new Error('Source site not found');
        err.status = 404;
        throw err;
    }
    const sourceDomain = siteRows[0].subdomain;

    // Find target site
    const targetSite = await findSiteByDomain(targetDomain);
    if (!targetSite) {
        const err = new Error('Target site not found');
        err.status = 404;
        throw err;
    }

    // Prevent self-federation
    if (targetSite.id === parseInt(sourceSiteId)) {
        const err = new Error('Cannot federate with yourself');
        err.status = 400;
        throw err;
    }

    // Check for existing pending/accepted request
    const { rows: existing } = await db.query(
        `SELECT id FROM federation_requests
         WHERE source_site_id = $1 AND target_site_id = $2 AND status IN ('pending','accepted')`,
        [sourceSiteId, targetSite.id]
    );
    if (existing.length > 0) {
        const err = new Error('Federation request already exists');
        err.status = 409;
        throw err;
    }

    // Get or create keypair
    const { publicKey } = await keyResolver.getOrCreate({ siteId: sourceSiteId, domain: sourceDomain });

    const defaultScope = DEFAULT_SCOPES[relationType] || DEFAULT_SCOPES.collateral;

    // Insert federation request
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

    return rows[0];
};

// ────────────────────────────────────────
// API 2: Accept federation request
// ────────────────────────────────────────

exports.acceptFederation = async (userId, { requestId, targetNodeId, agreedScope }) => {
    if (!requestId) {
        const err = new Error('requestId is required');
        err.status = 400;
        throw err;
    }

    // Get pending request
    const { rows: reqRows } = await db.query(
        'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
        [requestId, 'pending']
    );
    if (!reqRows.length) {
        const err = new Error('Pending federation request not found');
        err.status = 404;
        throw err;
    }
    const fedReq = reqRows[0];

    // Check target site owner
    if (!await checkSiteOwner(userId, fedReq.target_site_id)) {
        const err = new Error('Only target site owner can accept');
        err.status = 403;
        throw err;
    }

    // Get or create target keypair
    const { publicKey } = await keyResolver.getOrCreate({
        siteId: fedReq.target_site_id,
        domain: fedReq.target_domain,
    });

    // Determine agreed scope
    const finalScope = agreedScope || DEFAULT_SCOPES[fedReq.relation_type] || DEFAULT_SCOPES.collateral;

    // Update request to accepted
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

    return rows[0];
};

// ────────────────────────────────────────
// API 3: Reject federation request
// ────────────────────────────────────────

exports.rejectFederation = async (userId, { requestId }) => {
    if (!requestId) {
        const err = new Error('requestId is required');
        err.status = 400;
        throw err;
    }

    const { rows: reqRows } = await db.query(
        'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
        [requestId, 'pending']
    );
    if (!reqRows.length) {
        const err = new Error('Pending federation request not found');
        err.status = 404;
        throw err;
    }

    // Check target site owner
    if (!await checkSiteOwner(userId, reqRows[0].target_site_id)) {
        const err = new Error('Only target site owner can reject');
        err.status = 403;
        throw err;
    }

    const { rows } = await db.query(
        `UPDATE federation_requests SET status = 'rejected', responder_id = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, requestId]
    );

    return rows[0];
};

// ────────────────────────────────────────
// API 4: Generate federation token
// ────────────────────────────────────────

exports.generateFederationToken = async (userId, { federationId }) => {
    if (!federationId) {
        const err = new Error('federationId is required');
        err.status = 400;
        throw err;
    }

    const { rows: fedRows } = await db.query(
        'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
        [federationId, 'accepted']
    );
    if (!fedRows.length) {
        const err = new Error('Accepted federation not found');
        err.status = 404;
        throw err;
    }
    const fed = fedRows[0];

    // Check source site owner
    if (!await checkSiteOwner(userId, fed.source_site_id)) {
        const err = new Error('Only source site owner can generate token');
        err.status = 403;
        throw err;
    }

    // Get source site keys
    const keys = await keyResolver.getOrCreate({
        siteId: fed.source_site_id,
        domain: fed.source_domain,
    });

    // Sign JWT
    const { token, nonce } = signFederationJWT(
        {
            iss: fed.source_domain,
            sub: `federation:${federationId}`,
            scope: fed.agreed_scope || [],
            targetDomain: fed.target_domain,
            relation_type: fed.relation_type,
        },
        keys.privateKey
    );

    return { token, nonce, expiresIn: '5m' };
};

// ────────────────────────────────────────
// API 5: Resolve single node
// ────────────────────────────────────────

exports.resolveNode = async (federation, federationClaims, nodeId) => {
    // federation: already validated by middleware (from DB, status='accepted')
    // federationClaims: {iss, sub, scope, effectiveScope, nonce, ...}

    // Get person data with effective scope
    const person = await getPersonData(
        nodeId,
        federation.target_site_id,
        federation.relation_type,
        federationClaims.effectiveScope
    );

    if (!person) {
        const err = new Error('Person not found');
        err.status = 404;
        throw err;
    }

    // Get outgoing wormholes
    const visitedDomains = [federation.source_domain];
    const outgoingWormholes = await getOutgoingWormholes(
        federation.target_site_id,
        federation.target_domain,
        visitedDomains,
        federationClaims.effectiveScope
    );

    return {
        person,
        federation: {
            id: federation.id,
            relationType: federation.relation_type,
            sourceDomain: federation.source_domain,
            targetDomain: federation.target_domain,
            scope: federation.agreed_scope,
        },
        outgoingWormholes,
    };
};

// ────────────────────────────────────────
// API 6: Resolve batch nodes
// ────────────────────────────────────────

exports.resolveBatch = async (federation, federationClaims, nodeIds) => {
    // Validate batch size
    if (!Array.isArray(nodeIds) || nodeIds.length > 50) {
        const err = new Error('Maximum 50 nodes per batch request');
        err.status = 400;
        throw err;
    }

    const results = [];
    for (const nodeId of nodeIds) {
        // Check cache first
        const cacheKey = `person:${federation.target_site_id}:${nodeId}`;
        let person = metaCache.get(cacheKey);

        if (!person) {
            // Query and cache
            person = await getPersonData(
                nodeId,
                federation.target_site_id,
                federation.relation_type,
                federationClaims.effectiveScope
            );
            if (person) {
                metaCache.set(cacheKey, person);
            }
        }

        if (person) {
            results.push(person);
        }
    }

    return results;
};

// ────────────────────────────────────────
// API 7: Chain resolve (multi-hop traversal)
// ────────────────────────────────────────

const MAX_CHAIN_HOPS = 5;

exports.chainResolve = async (initialJWT, chain) => {
    // Validate chain
    if (!Array.isArray(chain) || chain.length < 1 || chain.length > MAX_CHAIN_HOPS) {
        const err = new Error(`chain[] must have 1-${MAX_CHAIN_HOPS} hops`);
        err.status = 400;
        throw err;
    }

    const visitedDomains = [];
    let currentJWT = initialJWT;
    let effectiveScope = null;
    const results = [];

    for (let i = 0; i < chain.length; i++) {
        const hop = chain[i];
        const { federationId, nodeId } = hop;

        if (!federationId || !nodeId) {
            const err = new Error(`Hop ${i + 1}: federationId and nodeId are required`);
            err.status = 400;
            throw err;
        }

        // Get federation
        const { rows: fedRows } = await db.query(
            'SELECT * FROM federation_requests WHERE id = $1 AND status = $2',
            [federationId, 'accepted']
        );
        if (!fedRows.length) {
            const err = new Error(`Hop ${i + 1}: Accepted federation not found`);
            err.status = 404;
            throw err;
        }
        const fed = fedRows[0];

        // Cycle detection
        if (visitedDomains.includes(fed.target_domain)) {
            const err = new Error(`Cycle detected: ${fed.target_domain} already visited`);
            err.status = 400;
            throw err;
        }

        // Verify JWT
        let decoded;
        try {
            decoded = verifyFederationJWT(currentJWT, fed.source_public_key, []);
        } catch (err) {
            const error = new Error(`Hop ${i + 1}: JWT verification failed — ${err.message}`);
            error.status = 401;
            throw error;
        }

        // Validate issuer
        if (decoded.iss !== fed.source_domain) {
            const err = new Error(`Hop ${i + 1}: Issuer mismatch (${decoded.iss} vs ${fed.source_domain})`);
            err.status = 403;
            throw err;
        }

        // Replay attack check
        if (nonceCache.add(decoded.nonce)) {
            const err = new Error(`Hop ${i + 1}: Nonce replay detected`);
            err.status = 401;
            throw err;
        }

        // Scope escalation: intersect decoded scope, relation type, and federation agreement
        const maxAllowedScope = DEFAULT_SCOPES[fed.relation_type] || DEFAULT_SCOPES.collateral;
        const hopScope = intersectScopes(
            intersectScopes(decoded.scope, maxAllowedScope),
            fed.agreed_scope || []
        );

        if (i === 0) {
            effectiveScope = hopScope;
        } else {
            effectiveScope = intersectScopes(effectiveScope, hopScope);
        }

        if (effectiveScope.length === 0) {
            const err = new Error(`Hop ${i + 1}: No effective scope remaining`);
            err.status = 403;
            throw err;
        }

        // Get person data
        const cacheKey = `person:${fed.target_site_id}:${nodeId}`;
        let person = metaCache.get(cacheKey);
        if (!person) {
            person = await getPersonData(
                nodeId,
                fed.target_site_id,
                fed.relation_type,
                effectiveScope
            );
            if (person) {
                metaCache.set(cacheKey, person);
            }
        }

        if (!person) {
            const err = new Error(`Hop ${i + 1}: Person not found (${nodeId})`);
            err.status = 404;
            throw err;
        }

        visitedDomains.push(fed.source_domain);

        // Generate JWT for next hop if needed
        if (i < chain.length - 1) {
            const nextHop = chain[i + 1];
            const nextFedId = nextHop.federationId;

            const keys = await keyResolver.getOrCreate({
                siteId: fed.target_site_id,
                domain: fed.target_domain,
            });

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

        // Get outgoing wormholes for last hop only
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

    return {
        hops: results,
        visitedDomains: [...visitedDomains, results[results.length - 1]?.federation.targetDomain],
        totalHops: results.length,
    };
};

// ────────────────────────────────────────
// API 8: List federations for user
// ────────────────────────────────────────

exports.listFederations = async (userId) => {
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
    return rows;
};
