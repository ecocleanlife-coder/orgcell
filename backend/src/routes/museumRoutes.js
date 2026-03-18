const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/museumController');
const { optionalAuth } = require('../middlewares/authMiddleware');

router.get('/:subdomain', optionalAuth, ctrl.getMuseumBySubdomain);

module.exports = router;
