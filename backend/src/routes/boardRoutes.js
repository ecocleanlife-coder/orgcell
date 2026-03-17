const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/boardController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/posts', ctrl.listPosts);
router.post('/posts', protect, ctrl.createPost);
router.get('/posts/:id', ctrl.getPost);
router.post('/posts/:id/comments', protect, ctrl.addComment);

module.exports = router;
