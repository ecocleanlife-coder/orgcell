const express = require('express');
const router = express.Router();
const { getPhotos, uploadPhoto, deletePhoto } = require('../controllers/photoController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getPhotos);
router.post('/upload', uploadPhoto);
router.delete('/:id', deletePhoto);

module.exports = router;
