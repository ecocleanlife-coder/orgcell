const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/oneDriveController');
const { protect } = require('../middlewares/authMiddleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(protect);

router.get('/auth', ctrl.getAuthUrl);
router.post('/callback', ctrl.callback);
router.get('/status', ctrl.status);
router.post('/setup', ctrl.setupFolder);
router.post('/upload', upload.single('file'), ctrl.upload);
router.get('/download/:fileId', ctrl.download);
router.delete('/file/:fileId', ctrl.deleteFile);
router.post('/disconnect', ctrl.disconnect);

module.exports = router;
