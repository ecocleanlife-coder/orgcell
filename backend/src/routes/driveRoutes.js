const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getDriveAuthUrl,
    driveCallback,
    driveStatus,
    setupDriveFolder,
    uploadToDrive,
} = require('../controllers/driveController');
const { protect } = require('../middlewares/authMiddleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(protect);

router.get('/auth', getDriveAuthUrl);
router.post('/callback', driveCallback);
router.get('/status', driveStatus);
router.post('/setup', setupDriveFolder);
router.post('/upload', upload.single('file'), uploadToDrive);

module.exports = router;
