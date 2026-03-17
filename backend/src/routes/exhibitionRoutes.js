const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/exhibitionController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', ctrl.listExhibitions);
router.post('/', protect, ctrl.createExhibition);
router.get('/:id', ctrl.getExhibition);
router.get('/:id/guestbook', ctrl.listGuestbook);
router.post('/:id/guestbook', ctrl.addGuestbook);

module.exports = router;
