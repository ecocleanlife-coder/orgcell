const express = require('express');
const router = express.Router();
const {
    scanDuplicates, deleteDuplicates, copyToFolder,
    getScanReport, faceClassify
} = require('../controllers/scanController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/duplicates', scanDuplicates);
router.post('/duplicates/delete', deleteDuplicates);
router.post('/duplicates/copy', copyToFolder);
router.get('/report', getScanReport);
router.post('/face-classify', faceClassify);

module.exports = router;
