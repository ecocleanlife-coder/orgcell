const express = require('express');
const router = express.Router();
const {
    scanDuplicates, deleteDuplicates, copyToFolder,
    getScanReport, faceClassify,
    startSmartSort, getSmartSortStatus, applySmartSort, getSupportedExtensions,
} = require('../controllers/scanController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// Smart Sort (Antigravity engine) routes
router.post('/smart-sort/start', startSmartSort);
router.get('/smart-sort/status/:jobId', getSmartSortStatus);
router.post('/smart-sort/apply', applySmartSort);
router.get('/smart-sort/extensions', getSupportedExtensions);

// Existing DB-based scan routes
router.post('/duplicates', scanDuplicates);
router.post('/duplicates/delete', deleteDuplicates);
router.post('/duplicates/copy', copyToFolder);
router.get('/report', getScanReport);
router.post('/face-classify', faceClassify);

module.exports = router;
