const express = require('express');
const router = express.Router();
const {
    createEvent, joinEvent, addEventPhoto,
    getEventFeed, reactToPhoto, getEventQR
} = require('../controllers/eventController');
const { protect } = require('../middlewares/authMiddleware');

// Public
router.get('/:code/qr', getEventQR);
router.get('/:code/feed', getEventFeed);

// Protected
router.use(protect);
router.post('/', createEvent);
router.post('/:code/join', joinEvent);
router.post('/:code/photos', addEventPhoto);
router.post('/:code/photos/:photoId/react', reactToPhoto);

module.exports = router;
