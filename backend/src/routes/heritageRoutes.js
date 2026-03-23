const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/heritageController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/:siteId', protect, ctrl.listHeritage);
router.post('/:siteId', protect, ctrl.createHeritage);
router.put('/:siteId/:id', protect, ctrl.updateHeritage);
router.delete('/:siteId/:id', protect, ctrl.deleteHeritage);

module.exports = router;
