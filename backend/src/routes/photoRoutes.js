const express = require('express');
const router = express.Router();
const { getPhotos, getPhoto, uploadPhoto, deletePhoto, getTimeline, getMapPhotos, getMonths, verifyOwnership } = require('../controllers/photoController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getPhotos);
router.get('/timeline', getTimeline);
router.get('/map', getMapPhotos);
router.get('/months', getMonths);
router.get('/:id', getPhoto);
router.post('/upload', uploadPhoto);
router.post('/:id/verify', verifyOwnership);
router.delete('/:id', deletePhoto);

module.exports = router;
