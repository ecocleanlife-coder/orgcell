const { google } = require('googleapis');
const db = require('../config/db');

// Google Drive OAuth2 client
function getDriveClient(tokens) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);
    return google.drive({ version: 'v3', auth: oauth2Client });
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
        await db.query(
            `UPDATE users SET google_drive_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(tokens), userId]
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
        const { rows } = await db.query(
            `SELECT google_drive_token FROM users WHERE id = $1`,
            [req.user.id]
        );

        const connected = !!(rows[0] && rows[0].google_drive_token);
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
        const { rows } = await db.query(
            `SELECT google_drive_token FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (!rows[0]?.google_drive_token) {
            return res.status(400).json({ success: false, message: 'Google Drive not connected' });
        }

        const drive = getDriveClient(rows[0].google_drive_token);

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
        const { rows } = await db.query(
            `SELECT google_drive_token FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (!rows[0]?.google_drive_token) {
            return res.status(400).json({ success: false, message: 'Google Drive not connected' });
        }

        const drive = getDriveClient(rows[0].google_drive_token);
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

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('uploadToDrive Error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload to Drive' });
    }
};
