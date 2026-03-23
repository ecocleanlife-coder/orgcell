const db = require('../config/db');
const crypto = require('crypto');

const CLIENT_ID = process.env.DROPBOX_CLIENT_ID;
const CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;

function getRedirectUri(frontendUrl) {
    return `${frontendUrl}/dropbox-callback`;
}

// Dropbox token from DB
async function getDropboxToken(userId) {
    const { rows } = await db.query(
        `SELECT dropbox_token FROM users WHERE id = $1`,
        [userId]
    );
    if (!rows[0]?.dropbox_token) return null;
    const token = rows[0].dropbox_token;
    return typeof token === 'string' ? JSON.parse(token) : token;
}

// Refresh token
async function refreshAccessToken(userId, token) {
    if (!token.refresh_token) return token;

    const now = Date.now();
    if (token.expires_at && token.expires_at > now + 60000) return token;

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
    });

    const resp = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!resp.ok) {
        console.error('Dropbox token refresh failed:', await resp.text());
        return token;
    }

    const data = await resp.json();
    const newToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || token.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
    };

    await db.query(
        `UPDATE users SET dropbox_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [JSON.stringify(newToken), userId]
    );

    return newToken;
}

// Dropbox API helper
async function dropboxFetch(userId, url, options = {}) {
    let token = await getDropboxToken(userId);
    if (!token) throw new Error('Dropbox not connected');

    token = await refreshAccessToken(userId, token);

    const resp = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token.access_token}`,
            ...options.headers,
        },
    });

    return resp;
}

// @desc    Get Dropbox OAuth URL
// @route   GET /api/dropbox/auth
exports.getAuthUrl = async (req, res) => {
    try {
        const state = crypto.randomBytes(16).toString('hex') + ':' + req.user.id;
        const redirectUri = getRedirectUri(process.env.FRONTEND_URL);

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            response_type: 'code',
            redirect_uri: redirectUri,
            state,
            token_access_type: 'offline',
        });

        const authUrl = `https://www.dropbox.com/oauth2/authorize?${params}`;
        res.json({ success: true, url: authUrl });
    } catch (error) {
        console.error('getDropboxAuthUrl Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate auth URL' });
    }
};

// @desc    Exchange auth code for Dropbox tokens
// @route   POST /api/dropbox/callback
exports.callback = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;
        const redirectUri = getRedirectUri(process.env.FRONTEND_URL);

        const params = new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: redirectUri,
        });

        const resp = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error('Dropbox token exchange failed:', errText);
            return res.status(400).json({ success: false, message: 'Token exchange failed' });
        }

        const data = await resp.json();
        const tokenJson = JSON.stringify({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
        });

        await db.query(
            `UPDATE users SET dropbox_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [tokenJson, userId]
        );

        res.json({ success: true, message: 'Dropbox connected' });
    } catch (error) {
        console.error('dropboxCallback Error:', error);
        res.status(500).json({ success: false, message: 'Failed to connect Dropbox' });
    }
};

// @desc    Check Dropbox connection status
// @route   GET /api/dropbox/status
exports.status = async (req, res) => {
    try {
        const token = await getDropboxToken(req.user.id);
        res.json({ success: true, connected: !!token });
    } catch (error) {
        console.error('dropboxStatus Error:', error);
        res.status(500).json({ success: false, message: 'Failed to check status' });
    }
};

// @desc    Create Orgcell folder in Dropbox
// @route   POST /api/dropbox/setup
exports.setupFolder = async (req, res) => {
    try {
        // Check if /Orgcell folder exists
        let resp = await dropboxFetch(req.user.id, 'https://api.dropboxapi.com/2/files/get_metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: '/Orgcell' }),
        });

        let folderPath = '/Orgcell';
        if (!resp.ok && resp.status === 409) {
            // Folder doesn't exist, create it
            resp = await dropboxFetch(req.user.id, 'https://api.dropboxapi.com/2/files/create_folder_v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: '/Orgcell' }),
            });

            if (!resp.ok) {
                return res.status(500).json({ success: false, message: 'Failed to create folder' });
            }
        } else if (!resp.ok) {
            return res.status(500).json({ success: false, message: 'Failed to check folder status' });
        }

        // Create subfolders
        for (const sub of ['originals', 'thumbnails']) {
            const subPath = `/Orgcell/${sub}`;
            resp = await dropboxFetch(req.user.id, 'https://api.dropboxapi.com/2/files/get_metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: subPath }),
            });

            if (!resp.ok && resp.status === 409) {
                // Subfolder doesn't exist, create it
                resp = await dropboxFetch(req.user.id, 'https://api.dropboxapi.com/2/files/create_folder_v2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: subPath }),
                });

                if (!resp.ok) {
                    console.error(`Failed to create ${subPath}`);
                }
            }
        }

        res.json({ success: true, folderPath });
    } catch (error) {
        console.error('setupDropboxFolder Error:', error);
        res.status(500).json({ success: false, message: 'Failed to setup folder' });
    }
};

// @desc    Upload file to Dropbox
// @route   POST /api/dropbox/upload
exports.upload = async (req, res) => {
    try {
        const { filename, folderPath } = req.body;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const name = filename || req.file.originalname;
        const uploadPath = folderPath ? `${folderPath}/${name}` : `/Orgcell/${name}`;

        const resp = await dropboxFetch(req.user.id, 'https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                    path: uploadPath,
                    mode: 'add',
                    autorename: true,
                }),
            },
            body: req.file.buffer,
        });

        if (!resp.ok) {
            return res.status(500).json({ success: false, message: 'Upload failed' });
        }

        const data = await resp.json();
        res.json({
            success: true,
            data: {
                id: data.id,
                name: data.name,
                size: data.size,
                path_display: data.path_display
            }
        });
    } catch (error) {
        console.error('uploadToDropbox Error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload' });
    }
};

// @desc    Download file from Dropbox
// @route   GET /api/dropbox/download/:fileId
exports.download = async (req, res) => {
    try {
        const resp = await dropboxFetch(req.user.id, 'https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: {
                'Dropbox-API-Arg': JSON.stringify({
                    path: req.params.fileId,
                }),
            },
        });

        if (!resp.ok) {
            return res.status(500).json({ success: false, message: 'Download failed' });
        }

        const buffer = await resp.arrayBuffer();
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('downloadFromDropbox Error:', error);
        res.status(500).json({ success: false, message: 'Failed to download' });
    }
};

// @desc    Delete file from Dropbox
// @route   DELETE /api/dropbox/file/:fileId
exports.deleteFile = async (req, res) => {
    try {
        const resp = await dropboxFetch(req.user.id, 'https://api.dropboxapi.com/2/files/delete_v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: req.params.fileId }),
        });

        if (!resp.ok && resp.status !== 200) {
            return res.status(500).json({ success: false, message: 'Delete failed' });
        }

        res.json({ success: true, message: 'File deleted from Dropbox' });
    } catch (error) {
        console.error('deleteFromDropbox Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

// @desc    Disconnect Dropbox
// @route   POST /api/dropbox/disconnect
exports.disconnect = async (req, res) => {
    try {
        await db.query(
            `UPDATE users SET dropbox_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [req.user.id]
        );
        res.json({ success: true, message: 'Dropbox disconnected' });
    } catch (error) {
        console.error('disconnectDropbox Error:', error);
        res.status(500).json({ success: false, message: 'Failed to disconnect' });
    }
};
