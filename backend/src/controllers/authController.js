const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { sendMagicLinkEmail } = require('../services/emailService');

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

        // Fetch family info
        const { rows: famRows } = await db.query(
            'SELECT family_id, role FROM users WHERE id = $1', [user.id]
        );
        const familyId = famRows[0]?.family_id || null;
        const role = famRows[0]?.role || 'guest';

        // Generate JWT
        const token = jwt.sign(
            { user: { id: user.id, email: user.email, name: user.name, family_id: familyId, role } },
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
                family_id: familyId,
                role,
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
            `SELECT id, email, name, avatar_url, family_id, role, created_at FROM users WHERE id = $1`,
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

// Rate limit: max 5 requests per email per 15 min
const rateLimitMap = new Map();

// @desc    Request magic link
// @route   POST /api/auth/magic-link/request
exports.requestMagicLink = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Valid email required' });
        }

        // Rate limiting
        const key = email.toLowerCase();
        const now = Date.now();
        const attempts = rateLimitMap.get(key) || [];
        const recent = attempts.filter(t => now - t < 15 * 60 * 1000);
        if (recent.length >= 5) {
            return res.status(429).json({ success: false, message: 'Too many requests. Try again in 15 minutes.' });
        }
        recent.push(now);
        rateLimitMap.set(key, recent);

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        // Store token
        await db.query(
            `INSERT INTO magic_link_tokens (email, token, expires_at) VALUES ($1, $2, $3)`,
            [key, token, expiresAt]
        );

        // Build magic link URL
        const frontendUrl = process.env.FRONTEND_URL || 'https://orgcell.com';
        const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

        // Send email
        await sendMagicLinkEmail(key, magicLink);

        res.json({ success: true, message: 'Magic link sent to your email' });
    } catch (error) {
        console.error('requestMagicLink Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send magic link' });
    }
};

// @desc    Verify magic link token and login
// @route   POST /api/auth/magic-link/verify
exports.verifyMagicLink = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Token required' });
        }

        // Find valid token
        const { rows: tokenRows } = await db.query(
            `SELECT id, email, expires_at, used FROM magic_link_tokens WHERE token = $1`,
            [token]
        );

        if (tokenRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired link' });
        }

        const linkToken = tokenRows[0];

        if (linkToken.used) {
            return res.status(400).json({ success: false, message: 'This link has already been used' });
        }

        if (new Date(linkToken.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'This link has expired' });
        }

        // Mark token as used
        await db.query(`UPDATE magic_link_tokens SET used = true WHERE id = $1`, [linkToken.id]);

        // Upsert user by email (no google_id needed)
        const email = linkToken.email;
        const name = email.split('@')[0]; // default name from email

        const { rows: userRows } = await db.query(
            `INSERT INTO users (google_id, email, name)
             VALUES (NULL, $1, $2)
             ON CONFLICT (email) DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP
             RETURNING id, email, name, avatar_url`,
            [email, name]
        );

        const user = userRows[0];

        // Fetch family info
        const { rows: famRows } = await db.query(
            'SELECT family_id, role FROM users WHERE id = $1', [user.id]
        );
        const familyId = famRows[0]?.family_id || null;
        const role = famRows[0]?.role || 'guest';

        // Generate JWT (same format as Google login)
        const jwtToken = jwt.sign(
            { user: { id: user.id, email: user.email, name: user.name, family_id: familyId, role } },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
                family_id: familyId,
                role,
            },
        });
    } catch (error) {
        console.error('verifyMagicLink Error:', error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
};
