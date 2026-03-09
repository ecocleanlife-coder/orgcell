const express = require('express');
const router = express.Router();
const {
    createSite, getMySite, createFolder, getFolderMedia,
    addMedia, getPricing, getPublicSite
} = require('../controllers/siteController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.get('/pricing', getPricing);
router.get('/public/:subdomain', getPublicSite);

// Protected routes
router.use(protect);
router.post('/', createSite);
router.get('/mine', getMySite);
router.post('/:siteId/folders', createFolder);
router.get('/:siteId/folders/:folderId/media', getFolderMedia);
router.post('/:siteId/folders/:folderId/media', addMedia);

module.exports = router;
