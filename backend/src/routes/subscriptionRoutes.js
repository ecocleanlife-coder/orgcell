const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware');

// GET /api/subscriptions/status
// Returns { success: true, hasSubscription: bool }
router.get('/status', protect, async (req, res) => {
    try {
        const email = req.user.email;
        if (!email) {
            return res.json({ success: true, hasSubscription: false });
        }

        let hasSubscription = false;
        try {
            const { rows } = await db.query(
                `SELECT id FROM subscriptions WHERE email = $1 AND status = 'active' LIMIT 1`,
                [email.toLowerCase()]
            );
            hasSubscription = rows.length > 0;
        } catch (e) {
            // subscriptions table may not exist yet
        }

        res.json({ success: true, hasSubscription });
    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
