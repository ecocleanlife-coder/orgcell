const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domainController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/check', domainController.checkDomain);
router.post('/register', protect, domainController.registerDomain);

module.exports = router;
