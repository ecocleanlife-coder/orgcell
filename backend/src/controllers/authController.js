const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Google SSO Login
// @route   POST /api/auth/google
exports.googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential required' });
        }

        // Verify Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Upsert user
        const { rows } = await db.query(
            `INSERT INTO users (google_id, email, name, avatar_url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (google_id) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                avatar_url = EXCLUDED.avatar_url,
                updated_at = CURRENT_TIMESTAMP
             RETURNING id, google_id, email, name, avatar_url`,
            [googleId, email, name, picture]
        );

        const user = rows[0];

        // Generate JWT
        const token = jwt.sign(
            { user: { id: user.id, email: user.email, name: user.name } },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
            },
        });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(500).json({ success: false, message: 'Google login failed' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('getMe Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get user' });
    }
};

// @desc    Dev-only login (no Google required)
// @route   POST /api/auth/dev-login
exports.devLogin = async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    try {
        const { email, name } = req.body;
        if (!email || !name) {
            return res.status(400).json({ success: false, message: 'email and name required' });
        }

        const googleId = `dev_${email.replace(/[^a-z0-9]/gi, '_')}`;

        const { rows } = await db.query(
            `INSERT INTO users (google_id, email, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (google_id) DO UPDATE SET
                name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
             RETURNING id, google_id, email, name, avatar_url`,
            [googleId, email, name]
        );

        const user = rows[0];
        const token = jwt.sign(
            { user: { id: user.id, email: user.email, name: user.name } },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ success: true, token, user });
    } catch (error) {
        console.error('devLogin Error:', error);
        res.status(500).json({ success: false, message: 'Dev login failed' });
    }
};
