const db = require('../config/db');
const crypto = require('crypto');

const TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const SCOPES = 'Files.ReadWrite.All offline_access';

function getRedirectUri(frontendUrl) {
    return `${frontendUrl}/onedrive-callback`;
}

// 유저 본인 OneDrive 토큰 조회
async function getOneDriveToken(userId) {
    const { rows } = await db.query(
        `SELECT onedrive_token FROM users WHERE id = $1`,
        [userId]
    );
    if (!rows[0]?.onedrive_token) return null;
    const token = rows[0].onedrive_token;
    return typeof token === 'string' ? JSON.parse(token) : token;
}

// 토큰 갱신 (refresh_token 사용)
async function refreshAccessToken(userId, token) {
    if (!token.refresh_token) return token;

    const now = Date.now();
    // expires_at이 없거나 만료 1분 전이면 갱신
    if (token.expires_at && token.expires_at > now + 60000) return token;

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        scope: SCOPES,
    });

    const resp = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
    });

    if (!resp.ok) {
        console.error('OneDrive token refresh failed:', await resp.text());
        return token;
    }

    const data = await resp.json();
    const newToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || token.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
    };

    await db.query(
        `UPDATE users SET onedrive_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [JSON.stringify(newToken), userId]
    );

    return newToken;
}

// Microsoft Graph API 호출 헬퍼
async function graphFetch(userId, path, options = {}) {
    let token = await getOneDriveToken(userId);
    if (!token) throw new Error('OneDrive not connected');

    token = await refreshAccessToken(userId, token);

    const resp = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token.access_token}`,
            ...options.headers,
        },
    });

    return resp;
}

// @desc    Get OneDrive OAuth URL
// @route   GET /api/onedrive/auth
exports.getAuthUrl = async (req, res) => {
    try {
        const state = crypto.randomBytes(16).toString('hex') + ':' + req.user.id;
        const redirectUri = getRedirectUri(process.env.FRONTEND_URL);

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: SCOPES,
            state,
            response_mode: 'query',
        });

        const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;
        res.json({ success: true, url: authUrl });
    } catch (error) {
        console.error('getOneDriveAuthUrl Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate auth URL' });
    }
};

// @desc    Exchange auth code for OneDrive tokens
// @route   POST /api/onedrive/callback
exports.callback = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;
        const redirectUri = getRedirectUri(process.env.FRONTEND_URL);

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            scope: SCOPES,
        });

        const resp = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error('OneDrive token exchange failed:', errText);
            return res.status(400).json({ success: false, message: 'Token exchange failed' });
        }

        const data = await resp.json();
        const tokenJson = JSON.stringify({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires_in * 1000,
        });

        await db.query(
            `UPDATE users SET onedrive_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [tokenJson, userId]
        );

        res.json({ success: true, message: 'OneDrive connected' });
    } catch (error) {
        console.error('oneDriveCallback Error:', error);
        res.status(500).json({ success: false, message: 'Failed to connect OneDrive' });
    }
};

// @desc    Check OneDrive connection status
// @route   GET /api/onedrive/status
exports.status = async (req, res) => {
    try {
        const token = await getOneDriveToken(req.user.id);
        res.json({ success: true, connected: !!token });
    } catch (error) {
        console.error('oneDriveStatus Error:', error);
        res.status(500).json({ success: false, message: 'Failed to check status' });
    }
};

// @desc    Create Orgcell folder in OneDrive
// @route   POST /api/onedrive/setup
exports.setupFolder = async (req, res) => {
    try {
        // Orgcell 폴더 존재 여부 확인
        let resp = await graphFetch(req.user.id, '/me/drive/root:/Orgcell', { method: 'GET' });

        let folderId;
        if (resp.ok) {
            const folder = await resp.json();
            folderId = folder.id;
        } else {
            // 폴더 생성
            resp = await graphFetch(req.user.id, '/me/drive/root/children', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Orgcell',
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename',
                }),
            });

            if (!resp.ok) {
                return res.status(500).json({ success: false, message: 'Failed to create folder' });
            }
            const folder = await resp.json();
            folderId = folder.id;

            // 서브폴더 생성
            for (const sub of ['originals', 'thumbnails']) {
                await graphFetch(req.user.id, `/me/drive/items/${folderId}/children`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: sub,
                        folder: {},
                        '@microsoft.graph.conflictBehavior': 'rename',
                    }),
                });
            }
        }

        res.json({ success: true, folderId });
    } catch (error) {
        console.error('setupOneDriveFolder Error:', error);
        res.status(500).json({ success: false, message: 'Failed to setup folder' });
    }
};

// @desc    Upload file to OneDrive
// @route   POST /api/onedrive/upload
exports.upload = async (req, res) => {
    try {
        const { filename, folderId } = req.body;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const name = filename || req.file.originalname;
        const path = folderId
            ? `/me/drive/items/${folderId}:/${name}:/content`
            : `/me/drive/root:/Orgcell/${name}:/content`;

        const resp = await graphFetch(req.user.id, path, {
            method: 'PUT',
            headers: { 'Content-Type': req.file.mimetype || 'application/octet-stream' },
            body: req.file.buffer,
        });

        if (!resp.ok) {
            return res.status(500).json({ success: false, message: 'Upload failed' });
        }

        const data = await resp.json();
        res.json({ success: true, data: { id: data.id, name: data.name, size: data.size, webUrl: data.webUrl } });
    } catch (error) {
        console.error('uploadToOneDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload' });
    }
};

// @desc    Download file from OneDrive
// @route   GET /api/onedrive/download/:fileId
exports.download = async (req, res) => {
    try {
        const resp = await graphFetch(req.user.id, `/me/drive/items/${req.params.fileId}/content`, {
            method: 'GET',
            redirect: 'manual',
        });

        // Graph API returns 302 redirect to download URL
        if (resp.status === 302) {
            return res.redirect(resp.headers.get('location'));
        }

        if (!resp.ok) {
            return res.status(500).json({ success: false, message: 'Download failed' });
        }

        const buffer = await resp.arrayBuffer();
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('downloadFromOneDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to download' });
    }
};

// @desc    Delete file from OneDrive
// @route   DELETE /api/onedrive/file/:fileId
exports.deleteFile = async (req, res) => {
    try {
        const resp = await graphFetch(req.user.id, `/me/drive/items/${req.params.fileId}`, {
            method: 'DELETE',
        });

        if (!resp.ok && resp.status !== 204) {
            return res.status(500).json({ success: false, message: 'Delete failed' });
        }

        res.json({ success: true, message: 'File deleted from OneDrive' });
    } catch (error) {
        console.error('deleteFromOneDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

// @desc    Disconnect OneDrive
// @route   POST /api/onedrive/disconnect
exports.disconnect = async (req, res) => {
    try {
        await db.query(
            `UPDATE users SET onedrive_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [req.user.id]
        );
        res.json({ success: true, message: 'OneDrive disconnected' });
    } catch (error) {
        console.error('disconnectOneDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to disconnect' });
    }
};
