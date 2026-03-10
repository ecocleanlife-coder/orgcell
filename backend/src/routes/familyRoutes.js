const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    createFamily,
    joinFamily,
    getMyFamily,
    updateMemberRole,
    syncDriveToken,
} = require('../controllers/familyController');

router.post('/', protect, createFamily);
router.post('/join', protect, joinFamily);
router.get('/me', protect, getMyFamily);
router.put('/members/:userId/role', protect, updateMemberRole);
router.post('/sync-drive', protect, syncDriveToken);

module.exports = router;
