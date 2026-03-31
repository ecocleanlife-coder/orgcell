const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/museumController');
const { protect, optionalAuth } = require('../middlewares/authMiddleware');

router.get('/mine', protect, ctrl.getMyMuseums);
router.get('/:subdomain', optionalAuth, ctrl.getMuseumBySubdomain);

module.exports = router;
