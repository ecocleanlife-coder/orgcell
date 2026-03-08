const express = require('express');
const router = express.Router();
const { createRoom, joinRoom, getRoom, exchangePhoto } = require('../controllers/roomController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', createRoom);
router.get('/:code', getRoom);
router.post('/:code/join', joinRoom);
router.post('/:code/exchange', exchangePhoto);

module.exports = router;
