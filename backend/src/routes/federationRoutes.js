const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { federationAuth, chainFederationAuth } = require('../middlewares/federationAuth');
const ctrl = require('../controllers/federationController');

// All federation management APIs require user authentication
router.post('/request', protect, ctrl.createRequest);
router.post('/accept', protect, ctrl.acceptRequest);
router.post('/reject', protect, ctrl.rejectRequest);
router.get('/list', protect, ctrl.listFederations);
router.post('/token', protect, ctrl.generateToken);

// Wormhole resolution — federationAuth middleware validates JWT and checks replay attacks
router.get('/resolve/:federationId/:nodeId', federationAuth, ctrl.resolveNode);
router.post('/resolve/batch', federationAuth, ctrl.resolveBatch);

// Chain resolution — lightweight middleware validates structure, per-hop verification in service
router.post('/chain-resolve', chainFederationAuth, ctrl.chainResolve);

module.exports = router;
