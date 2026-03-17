const db = require('../config/db');

const VALID_CATEGORIES = ['notice', 'daily', 'event', 'memory'];

// GET /api/board/posts?site_id=X&category=X
exports.listPosts = async (req, res) => {
    try {
        const { site_id, category } = req.query;
        if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });

        let query = `SELECT * FROM board_posts WHERE site_id = $1`;
        const params = [site_id];

        if (category && VALID_CATEGORIES.includes(category)) {
            query += ` AND category = $2`;
            params.push(category);
        }
        query += ` ORDER BY created_at DESC`;

        const { rows } = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listPosts error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/board/posts
exports.createPost = async (req, res) => {
    try {
        const { site_id, category, title, content } = req.body;
        if (!site_id || !title || !content) {
            return res.status(400).json({ success: false, message: 'site_id, title, content required' });
        }
        const cat = VALID_CATEGORIES.includes(category) ? category : 'daily';
        const authorId = req.user?.id || null;
        const authorName = req.user?.name || req.body.author_name || 'Anonymous';

        const { rows } = await db.query(
            `INSERT INTO board_posts (site_id, category, title, content, author_id, author_name)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [site_id, cat, title, content, authorId, authorName]
        );
        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('createPost error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/board/posts/:id
exports.getPost = async (req, res) => {
    try {
        const { rows: postRows } = await db.query(
            `SELECT * FROM board_posts WHERE id = $1`, [req.params.id]
        );
        if (!postRows.length) return res.status(404).json({ success: false, message: 'Not found' });

        const { rows: commentRows } = await db.query(
            `SELECT * FROM board_comments WHERE post_id = $1 ORDER BY created_at ASC`, [req.params.id]
        );
        res.json({ success: true, data: { ...postRows[0], comments: commentRows } });
    } catch (err) {
        console.error('getPost error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/board/posts/:id/comments
exports.addComment = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ success: false, message: 'content required' });

        const authorId = req.user?.id || null;
        const authorName = req.user?.name || req.body.author_name || 'Anonymous';
        const postId = req.params.id;

        const { rows } = await db.query(
            `INSERT INTO board_comments (post_id, author_id, author_name, content)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [postId, authorId, authorName, content]
        );

        // update comment_count
        await db.query(
            `UPDATE board_posts SET comment_count = comment_count + 1 WHERE id = $1`, [postId]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('addComment error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
