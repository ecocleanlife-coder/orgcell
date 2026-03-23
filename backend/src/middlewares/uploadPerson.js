const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/persons');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        cb(null, unique + ext);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'image/heic', 'image/heif',
    ];
    // iPhone may send heic as application/octet-stream
    const ext = path.extname(file.originalname).toLowerCase();
    const heicExts = ['.heic', '.heif'];
    cb(null, allowed.includes(file.mimetype) || heicExts.includes(ext));
};

const uploadPerson = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

// HEIC/HEIF → JPEG 변환 미들웨어
async function convertHeicIfNeeded(req, res, next) {
    if (!req.file) return next();

    const ext = path.extname(req.file.filename).toLowerCase();
    if (ext !== '.heic' && ext !== '.heif') return next();

    try {
        const inputPath = req.file.path;
        const outputName = req.file.filename.replace(/\.(heic|heif)$/i, '.jpg');
        const outputPath = path.join(UPLOADS_DIR, outputName);

        await sharp(inputPath)
            .jpeg({ quality: 85 })
            .toFile(outputPath);

        // 원본 HEIC 삭제
        fs.unlinkSync(inputPath);

        // req.file 정보 업데이트
        req.file.filename = outputName;
        req.file.path = outputPath;
        req.file.mimetype = 'image/jpeg';
    } catch (err) {
        console.error('HEIC conversion error:', err);
        // 변환 실패해도 원본 유지
    }

    next();
}

module.exports = uploadPerson;
module.exports.convertHeicIfNeeded = convertHeicIfNeeded;
