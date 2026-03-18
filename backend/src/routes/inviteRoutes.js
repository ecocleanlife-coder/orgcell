const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inviteController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/create', protect, ctrl.createInvite);
router.get('/info', ctrl.getInviteInfo);
router.post('/accept', protect, ctrl.acceptInvite);
router.post('/send-email', protect, ctrl.sendInviteEmailHandler);

module.exports = router;
