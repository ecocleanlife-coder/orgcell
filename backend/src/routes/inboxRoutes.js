const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inboxController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

router.use(protect);

router.get('/', ctrl.listInbox);
router.post('/send', upload.array('photos', 20), ctrl.sendPhotos);
router.post('/accept', ctrl.acceptPhotos);
router.delete('/:id', ctrl.deleteInboxPhoto);

module.exports = router;
