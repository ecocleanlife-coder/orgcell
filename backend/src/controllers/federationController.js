/**
 * Federation controller: thin HTTP handler layer.
 * All business logic delegated to federationService.
 */

const svc = require('../services/federationService');

/**
 * POST /api/federation/request
 * Create a new federation request.
 */
exports.createRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await svc.requestFederation(userId, req.body);
        res.status(201).json({ success: true, data });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Failed to create federation request' });
    }
};

/**
 * POST /api/federation/accept
 * Accept a pending federation request.
 */
exports.acceptRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await svc.acceptFederation(userId, req.body);
        res.json({ success: true, data });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Failed to accept federation request' });
    }
};

/**
 * POST /api/federation/reject
 * Reject a pending federation request.
 */
exports.rejectRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await svc.rejectFederation(userId, req.body);
        res.json({ success: true, data });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Failed to reject federation request' });
    }
};

/**
 * POST /api/federation/token
 * Generate a federation JWT token for accessing wormholes.
 */
exports.generateToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await svc.generateFederationToken(userId, req.body);
        res.json({ success: true, data });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Failed to generate federation token' });
    }
};

/**
 * GET /api/federation/list
 * List all federations for the authenticated user.
 */
exports.listFederations = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await svc.listFederations(userId);
        res.json({ success: true, data });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Failed to list federations' });
    }
};

/**
 * GET /api/federation/resolve/:federationId/:nodeId
 * Resolve a single person node across federation boundary.
 * Requires federationAuth middleware: req.federation and req.federationClaims attached.
 */
exports.resolveNode = async (req, res) => {
    try {
        const { nodeId } = req.params;
        const data = await svc.resolveNode(req.federation, req.federationClaims, nodeId);
        res.json({ success: true, data });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Failed to resolve node' });
    }
};

/**
 * POST /api/federation/resolve/batch
 * Resolve multiple person nodes in one request.
 * Body: { federationId, nodeIds[] }
 * Requires federationAuth middleware: req.federation and req.federationClaims attached.
 */
exports.resolveBatch = async (req, res) => {
    try {
        const { nodeIds } = req.body;
        const data = await svc.resolveBatch(req.federation, req.federationClaims, nodeIds);
        res.json({ success: true, data });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Failed to resolve batch' });
    }
};

/**
 * POST /api/federation/chain-resolve
 * Traverse multiple federation hops in sequence.
 * Body: { chain: [{federationId, nodeId}, ...] }
 * Requires chainFederationAuth middleware: req.initialFederationJWT attached.
 */
exports.chainResolve = async (req, res) => {
    try {
        const { chain } = req.body;
        const data = await svc.chainResolve(req.initialFederationJWT, chain);
        res.json({ success: true, data });
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ success: false, message: err.message || 'Failed to resolve chain' });
    }
};
