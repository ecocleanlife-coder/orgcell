const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    getFsAuthUrl,
    fsCallback,
    fsStatus,
    fsDisconnect,
    getFsTree,
    getFsPerson,
} = require('../controllers/familySearchController');

router.get('/auth', protect, getFsAuthUrl);
router.post('/callback', protect, fsCallback);
router.get('/status', protect, fsStatus);
router.post('/disconnect', protect, fsDisconnect);
router.get('/tree/:siteId', protect, getFsTree);
router.get('/person/:fsPersonId', protect, getFsPerson);

module.exports = router;
