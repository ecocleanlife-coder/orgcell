const express = require('express');
const router = express.Router();
const { optionalAuth, protect } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/calendarController');

router.get('/',        optionalAuth, ctrl.listEvents);
router.post('/',       protect,  ctrl.createEvent);
router.put('/:id',     protect,  ctrl.updateEvent);
router.delete('/:id',  protect,  ctrl.deleteEvent);

module.exports = router;
