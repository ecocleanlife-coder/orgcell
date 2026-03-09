const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { uploadPhotos, getRoomPhotos, serveFile } = require('../controllers/sharingController');
const { protect } = require('../middlewares/authMiddleware');

// Multer storage config
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../uploads/sharing'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `share_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// Public: serve files (no auth needed for shared viewing)
router.get('/files/:filename', serveFile);

// Protected routes
router.use(protect);
router.post('/upload', upload.array('photos', 20), uploadPhotos);
router.get('/:roomCode/photos', getRoomPhotos);

module.exports = router;
