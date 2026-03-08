const express = require('express');
const router = express.Router();
const { getPhotos, uploadPhoto, deletePhoto, getTimeline, getMapPhotos, getMonths } = require('../controllers/photoController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getPhotos);
router.get('/timeline', getTimeline);
router.get('/map', getMapPhotos);
router.get('/months', getMonths);
router.post('/upload', uploadPhoto);
router.delete('/:id', deletePhoto);

module.exports = router;
