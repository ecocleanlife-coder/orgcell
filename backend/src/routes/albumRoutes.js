const express = require('express');
const router = express.Router();
const { getAlbums, getAlbumPhotos, createAlbum, addPhotosToAlbum } = require('../controllers/albumController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getAlbums);
router.post('/', createAlbum);
router.get('/:id/photos', getAlbumPhotos);
router.post('/:id/photos', addPhotosToAlbum);

module.exports = router;
