const { google } = require('googleapis');
const db = require('../config/db');

// Google Drive OAuth2 client
function getDriveClient(tokens) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(typeof tokens === 'string' ? JSON.parse(tokens) : tokens);
    return google.drive({ version: 'v3', auth: oauth2Client });
}

// 유저 본인 Drive 토큰 → 없으면 가족 공유 토큰 fallback
async function getDriveToken(userId) {
    const { rows } = await db.query(
        `SELECT u.google_drive_token,
                f.google_drive_token as family_drive_token
         FROM users u
         LEFT JOIN families f ON u.family_id = f.id
         WHERE u.id = $1`,
        [userId]
    );
    if (!rows[0]) return null;
    const token = rows[0].google_drive_token || rows[0].family_drive_token;
    return token ? (typeof token === 'string' ? JSON.parse(token) : token) : null;
}

// @desc    Get Google Drive OAuth URL
// @route   GET /api/drive/auth
exports.getDriveAuthUrl = async (req, res) => {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.FRONTEND_URL}/drive-callback`
        );

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/drive.appdata',
            ],
            state: String(req.user.id),
        });

        res.json({ success: true, authUrl });
    } catch (error) {
        console.error('getDriveAuthUrl Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate auth URL' });
    }
};

// @desc    Exchange auth code for Drive tokens
// @route   POST /api/drive/callback
exports.driveCallback = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.FRONTEND_URL}/drive-callback`
        );

        const { tokens } = await oauth2Client.getToken(code);

        // Save tokens to user record
        const tokenJson = JSON.stringify(tokens);
        await db.query(
            `UPDATE users SET google_drive_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [tokenJson, userId]
        );

        // Auto-sync to family if user is admin
        await db.query(
            `UPDATE families SET google_drive_token = $1, updated_at = CURRENT_TIMESTAMP
             WHERE admin_user_id = $2`,
            [tokenJson, userId]
        );

        res.json({ success: true, message: 'Google Drive connected' });
    } catch (error) {
        console.error('driveCallback Error:', error);
        res.status(500).json({ success: false, message: 'Failed to connect Google Drive' });
    }
};

// @desc    Check Drive connection status
// @route   GET /api/drive/status
exports.driveStatus = async (req, res) => {
    try {
        const token = await getDriveToken(req.user.id);
        const connected = !!token;
        res.json({ success: true, connected });
    } catch (error) {
        console.error('driveStatus Error:', error);
        res.status(500).json({ success: false, message: 'Failed to check drive status' });
    }
};

// @desc    Create Orgcell folder in user's Drive
// @route   POST /api/drive/setup
exports.setupDriveFolder = async (req, res) => {
    try {
        const token = await getDriveToken(req.user.id);
        if (!token) {
            return res.status(400).json({ success: false, message: 'Google Drive not connected' });
        }

        const drive = getDriveClient(token);

        // Check if Orgcell folder already exists
        const existing = await drive.files.list({
            q: "name='Orgcell' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)',
        });

        let folderId;
        if (existing.data.files.length > 0) {
            folderId = existing.data.files[0].id;
        } else {
            const folder = await drive.files.create({
                requestBody: {
                    name: 'Orgcell',
                    mimeType: 'application/vnd.google-apps.folder',
                },
                fields: 'id',
            });
            folderId = folder.data.id;

            // Create subfolders
            for (const sub of ['originals', 'thumbnails']) {
                await drive.files.create({
                    requestBody: {
                        name: sub,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [folderId],
                    },
                });
            }
        }

        res.json({ success: true, folderId });
    } catch (error) {
        console.error('setupDriveFolder Error:', error);
        res.status(500).json({ success: false, message: 'Failed to setup Drive folder' });
    }
};

// @desc    Upload file to user's Drive (server-side relay for encrypted files)
// @route   POST /api/drive/upload
exports.uploadToDrive = async (req, res) => {
    try {
        const token = await getDriveToken(req.user.id);
        if (!token) {
            return res.status(400).json({ success: false, message: 'Google Drive not connected' });
        }

        const drive = getDriveClient(token);
        const { filename, mimeType, folderId } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const response = await drive.files.create({
            requestBody: {
                name: filename || req.file.originalname,
                parents: folderId ? [folderId] : [],
            },
            media: {
                mimeType: mimeType || req.file.mimetype,
                body: require('stream').Readable.from(req.file.buffer),
            },
            fields: 'id, name, size, webViewLink',
        });

        // Update photo record with Drive file ID
        if (req.body.photoId) {
            const field = req.body.type === 'thumbnail' ? 'drive_thumbnail_id' : 'drive_file_id';
            await db.query(
                `UPDATE photos SET ${field} = $1 WHERE id = $2 AND user_id = $3`,
                [response.data.id, req.body.photoId, req.user.id]
            );
        }

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('uploadToDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload to Drive' });
    }
};

// @desc    Download file from user's Drive
// @route   GET /api/drive/download/:fileId
exports.downloadFromDrive = async (req, res) => {
    try {
        const token = await getDriveToken(req.user.id);
        if (!token) {
            return res.status(400).json({ success: false, message: 'Google Drive not connected' });
        }

        const drive = getDriveClient(token);
        const response = await drive.files.get(
            { fileId: req.params.fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'private, max-age=86400');
        response.data.pipe(res);
    } catch (error) {
        console.error('downloadFromDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to download from Drive' });
    }
};

// @desc    Delete file from user's Drive
// @route   DELETE /api/drive/file/:fileId
exports.deleteFromDrive = async (req, res) => {
    try {
        const token = await getDriveToken(req.user.id);
        if (!token) {
            return res.status(400).json({ success: false, message: 'Google Drive not connected' });
        }

        const drive = getDriveClient(token);
        await drive.files.delete({ fileId: req.params.fileId });

        res.json({ success: true, message: 'File deleted from Drive' });
    } catch (error) {
        console.error('deleteFromDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete from Drive' });
    }
};

// @desc    Disconnect Google Drive (revoke tokens + remove from DB)
// @route   POST /api/drive/disconnect
exports.disconnectDrive = async (req, res) => {
    try {
        // Get current tokens to revoke
        const { rows } = await db.query(
            `SELECT google_drive_token FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (rows[0]?.google_drive_token) {
            try {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );
                oauth2Client.setCredentials(rows[0].google_drive_token);
                await oauth2Client.revokeCredentials();
            } catch (revokeErr) {
                // Token revocation may fail if already expired — continue cleanup
                console.warn('Token revocation failed (may already be expired):', revokeErr.message);
            }
        }

        await db.query(
            `UPDATE users SET google_drive_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [req.user.id]
        );
        res.json({ success: true, message: 'Google Drive disconnected' });
    } catch (error) {
        console.error('disconnectDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to disconnect Drive' });
    }
};
