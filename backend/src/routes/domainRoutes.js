const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domainController');

// Optional auth middleware integration
// const { authenticate } = require('../middlewares/authMiddleware');

router.get('/check', domainController.checkDomain);
router.post('/register', domainController.registerDomain);

module.exports = router;
