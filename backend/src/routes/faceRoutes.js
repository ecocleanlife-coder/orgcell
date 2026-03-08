const express = require('express');
const router = express.Router();
const { registerFace, getLabels, getDescriptors, saveDetectResult } = require('../controllers/faceController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/register', registerFace);
router.get('/labels', getLabels);
router.get('/descriptors', getDescriptors);
router.post('/detect-result', saveDetectResult);

module.exports = router;
