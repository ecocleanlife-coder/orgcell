const db = require('../config/db');
const crypto = require('crypto');

exports.checkDomain = async (req, res) => {
    try {
        const { subdomain } = req.query;
        if (!subdomain) {
            return res.status(400).json({ success: false, message: 'Subdomain is required' });
        }

        if (subdomain.length < 3) {
            return res.json({ success: true, available: false, reason: 'too_short' });
        }

        // Check both domains and family_sites tables
        let taken = false;

        try {
            const r1 = await db.query('SELECT id FROM domains WHERE subdomain = $1', [subdomain]);
            if (r1.rows.length > 0) taken = true;
        } catch (e) {
            // domains table may not exist — ignore
        }

        if (!taken) {
            try {
                const r2 = await db.query('SELECT id FROM family_sites WHERE subdomain = $1', [subdomain]);
                if (r2.rows.length > 0) taken = true;
            } catch (e) {
                // family_sites table may not exist — ignore
            }
        }

        res.json({ success: true, available: !taken, reason: taken ? 'taken' : null });
    } catch (error) {
        console.error('Check Domain Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.registerDomain = async (req, res) => {
    try {
        const { subdomain } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!subdomain) {
            return res.status(400).json({ success: false, message: 'Subdomain is required' });
        }

        // Ensure domains table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS domains (
                id SERIAL PRIMARY KEY,
                subdomain VARCHAR(255) UNIQUE NOT NULL,
                admin_key VARCHAR(50) UNIQUE NOT NULL,
                user_id INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check availability (both tables)
        const r1 = await db.query('SELECT id FROM domains WHERE subdomain = $1', [subdomain]);
        if (r1.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Domain is already taken' });
        }
        try {
            const r2 = await db.query('SELECT id FROM family_sites WHERE subdomain = $1', [subdomain]);
            if (r2.rows.length > 0) {
                return res.status(400).json({ success: false, message: 'Domain is already taken' });
            }
        } catch (e) { /* family_sites may not exist */ }

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
