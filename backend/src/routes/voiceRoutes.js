const router = require('express').Router();
const ctrl = require('../controllers/voiceController');
const { protect } = require('../middlewares/authMiddleware');
const uploadVoice = require('../middlewares/uploadVoice');

router.get('/recordings', ctrl.listRecordings);
router.post('/upload', protect, uploadVoice.single('audio'), ctrl.uploadRecording);
router.delete('/recordings/:id', protect, ctrl.deleteRecording);

module.exports = router;
