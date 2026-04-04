const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/manifest/:subdomain
// Returns a personalized PWA manifest for the museum
router.get('/:subdomain', async (req, res) => {
    try {
        const subdomain = req.params.subdomain.toLowerCase();
        const { rows } = await db.query(
            `SELECT fs.subdomain, u.name AS owner_name
             FROM family_sites fs
             JOIN users u ON u.id = fs.user_id
             WHERE fs.subdomain = $1`,
            [subdomain]
        );

        let appName, shortName;
        if (rows.length) {
            const ownerName = rows[0].owner_name || subdomain;
            appName = `${ownerName} 가족유산박물관`;
            shortName = `${ownerName.split(' ')[0]}의 박물관`;
        } else {
            appName = 'Orgcell 가족유산박물관';
            shortName = '가족유산박물관';
        }

        const manifest = {
            name: appName,
            short_name: shortName,
            description: '우리 가족의 유산을 영원히 보존하세요 — Orgcell',
            start_url: `/${subdomain}`,
            scope: `/${subdomain}`,
            display: 'standalone',
            background_color: '#f0ece4',
            theme_color: '#4a7a3a',
            orientation: 'portrait-primary',
            icons: [
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            ],
        };

        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.json(manifest);
    } catch (err) {
        console.error('manifestRoutes error:', err);
        res.status(500).json({ error: 'Failed to generate manifest' });
    }
});

module.exports = router;
