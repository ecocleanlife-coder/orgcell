const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/exhibitionController');
const photoCtrl = require('../controllers/exhibitionPhotoController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

router.get('/', ctrl.listExhibitions);
router.post('/', protect, ctrl.createExhibition);
router.get('/:id', ctrl.getExhibition);
router.put('/:id', protect, ctrl.updateExhibition);
router.delete('/:id', protect, ctrl.deleteExhibition);
router.get('/:id/guestbook', ctrl.listGuestbook);
router.post('/:id/guestbook', ctrl.addGuestbook);

// Photos
router.get('/:id/photos', photoCtrl.listPhotos);
router.post('/:id/photos', protect, upload.array('photos', 20), photoCtrl.uploadPhotos);
router.post('/:id/photos/move', protect, photoCtrl.movePhotos);
router.delete('/:id/photos/:photoId', protect, photoCtrl.deletePhoto);

module.exports = router;
