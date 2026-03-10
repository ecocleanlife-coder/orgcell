const db = require('../config/db');
const crypto = require('crypto');

exports.checkDomain = async (req, res) => {
    try {
        const { subdomain } = req.query;
        if (!subdomain) {
            return res.status(400).json({ success: false, message: 'Subdomain is required' });
        }

        const result = await db.query('SELECT id FROM domains WHERE subdomain = $1', [subdomain]);
        const isAvailable = result.rows.length === 0;

        res.json({ success: true, available: isAvailable });
    } catch (error) {
        console.error('Check Domain Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.registerDomain = async (req, res) => {
    try {
        const { subdomain } = req.body;
        const userId = req.user ? req.user.id : null; // Assuming authMiddleware sets req.user

        if (!subdomain) {
            return res.status(400).json({ success: false, message: 'Subdomain is required' });
        }

        // Check availability again to prevent race conditions
        const checkResult = await db.query('SELECT id FROM domains WHERE subdomain = $1', [subdomain]);
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Domain is already taken' });
        }

        // Generate Admin Key (e.g., ORG-FD-1A2B3C)
        const adminKey = 'ORG-FD-' + crypto.randomBytes(3).toString('hex').toUpperCase();

        const insertQuery = `
            INSERT INTO domains (subdomain, admin_key, user_id)
            VALUES ($1, $2, $3)
            RETURNING id, subdomain, admin_key, created_at
        `;
        const result = await db.query(insertQuery, [subdomain, adminKey, userId]);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Register Domain Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
