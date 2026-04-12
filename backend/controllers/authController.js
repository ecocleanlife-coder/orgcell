const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { sendMagicLinkEmail } = require('../services/emailService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// OAuth2Client 팩토리 (redirect flow용 — client_secret 포함)
function makeOAuthClient() {
    return new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'https://orgcell.com/api/auth/google/callback'
    );
}

// 공통 유저 upsert → JWT 발급 헬퍼
async function upsertUserAndIssueJwt(res, { googleId, email, name, picture }) {
    // 이메일은 항상 소문자로 정규화하여 저장 (대소문자 불일치 방지)
    const normalizedEmail = email.toLowerCase().trim();

    const { rows } = await db.query(
        `INSERT INTO users (google_id, email, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (google_id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = CURRENT_TIMESTAMP
         RETURNING id, google_id, email, name, avatar_url`,
        [googleId, normalizedEmail, name || normalizedEmail, picture || null]
    );
    const user = rows[0];

    // ★ owner_email 연결 수정:
    // 구글 로그인 성공 시, 이메일이 일치하는 family_sites의 user_id를
    // 현재 users.id로 자동 연결한다 (소문자 비교).
    //
    // family_sites에 owner_email 컬럼이 있는 경우: LOWER(owner_email) 비교
    // 없는 경우: users 테이블 JOIN으로 이메일 매칭
    //
    // 아래는 두 경우를 모두 커버하는 쿼리:
    // 1순위: owner_email 컬럼이 있으면 직접 비교
    // 2순위: users 테이블에 같은 이메일로 등록된 다른 user_id가 있으면 병합
    await db.query(
        `UPDATE family_sites fs
         SET user_id = $1
         WHERE user_id IS DISTINCT FROM $1
           AND (
             -- owner_email 컬럼이 있는 경우 (없으면 이 조건은 에러 → catch에서 무시)
             LOWER(fs.owner_email) = $2
           )`,
        [user.id, normalizedEmail]
    ).catch(() => {
        // owner_email 컬럼이 없는 경우 무시 — 아래 fallback 쿼리로 처리
    });

    // fallback: users 테이블에 같은 이메일의 다른 계정이 있던 경우
    // 해당 구 user_id 로 등록된 family_sites를 현재 id로 이전
    await db.query(
        `UPDATE family_sites fs
         SET user_id = $1
         FROM users old_u
         WHERE old_u.id = fs.user_id
           AND LOWER(old_u.email) = $2
           AND old_u.id != $1`,
        [user.id, normalizedEmail]
    ).catch(() => {});

    const { rows: famRows } = await db.query('SELECT family_id, role FROM users WHERE id = $1', [user.id]);
    const familyId = famRows[0]?.family_id || null;
    const role = famRows[0]?.role || 'guest';
    const token = jwt.sign(
        { user: { id: user.id, email: user.email, name: user.name, family_id: familyId, role } },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
    res.cookie('orgcell_token', token, COOKIE_OPTIONS);
    return { user, familyId, role };
}

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'strict'는 OAuth 외부 리다이렉트 시 쿠키 미전송 — 'lax' 사용
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
};

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

        const { user, familyId, role } = await upsertUserAndIssueJwt(res, { googleId, email, name, picture });
        res.json({
            success: true,
            user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, family_id: familyId, role },
        });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(500).json({ success: false, message: 'Google login failed' });
    }
};

// @desc    Google OAuth redirect 시작
// @route   GET /api/auth/google
exports.googleOAuthInit = (req, res) => {
    try {
        const client = makeOAuthClient();
        const state = encodeURIComponent(req.query.state || '/');
        const url = client.generateAuthUrl({
            access_type: 'offline',
            scope: ['profile', 'email'],
            state,
            prompt: 'select_account',
        });
        res.redirect(url);
    } catch (err) {
        console.error('googleOAuthInit Error:', err);
        const fe = process.env.FRONTEND_URL || 'https://orgcell.com';
        res.redirect(`${fe}/login?error=oauth_init_failed`);
    }
};

// @desc    Google OAuth 콜백
// @route   GET /api/auth/google/callback
exports.googleOAuthCallback = async (req, res) => {
    const fe = process.env.FRONTEND_URL || 'https://orgcell.com';
    try {
        const { code, state } = req.query;
        if (!code) return res.redirect(`${fe}/login?error=no_code`);

        const client = makeOAuthClient();
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        const { user: loggedInUser } = await upsertUserAndIssueJwt(res, { googleId, email, name, picture });

        // 박물관이 있으면 요청한 경로로, 없으면 /onboarding으로
        const { rows: siteRows } = await db.query(
            'SELECT subdomain FROM family_sites WHERE user_id = $1 LIMIT 1',
            [loggedInUser.id]
        );

        let redirectPath = state ? decodeURIComponent(state) : '/';
        // state가 기본값('/')이거나 박물관이 없으면 온보딩으로
        if (siteRows.length === 0) {
            redirectPath = '/onboarding';
        } else if (!redirectPath || redirectPath === '/') {
            redirectPath = `/${siteRows[0].subdomain}`;
        }

        const safeRedirect = redirectPath.startsWith('/') ? redirectPath : '/';
        res.redirect(`${fe}${safeRedirect}`);
    } catch (err) {
        console.error('googleOAuthCallback Error:', err);
        res.redirect(`${fe}/login?error=google_failed`);
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
            { expiresIn: '30d' }
        );

        res.cookie('orgcell_token', token, COOKIE_OPTIONS);
        res.json({ success: true, user });
    } catch (error) {
        console.error('devLogin Error:', error);
        res.status(500).json({ success: false, message: 'Dev login failed' });
    }
};

// @desc    Logout (clear httpOnly cookie)
// @route   POST /api/auth/logout
exports.logout = (req, res) => {
    res.clearCookie('orgcell_token', { path: '/' });
    res.json({ success: true });
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

        // 기존 계정 존재 여부 확인
        const { rows: existingUsers } = await db.query(
            `SELECT id, email FROM users WHERE email = $1`, [key]
        );
        const exists = existingUsers.length > 0;

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

        // 이메일 마스킹 (han***@gmail.com)
        const [localPart, domain] = key.split('@');
        const masked = localPart.slice(0, 3) + '***@' + domain;

        res.json({ success: true, message: 'Magic link sent to your email', exists, maskedEmail: masked });
    } catch (error) {
        console.error('requestMagicLink Error:', error.message, error.code);
        const isRateLimit = error.statusCode === 429 || error.code === 'rate_limit_exceeded';
        const message = isRateLimit
            ? '이메일 발송 한도에 도달했습니다. 1분 후 다시 시도해주세요.'
            : '이메일 발송에 실패했습니다. 스팸함을 확인하시거나, 잠시 후 다시 시도해주세요.';
        res.status(isRateLimit ? 429 : 500).json({ success: false, message });
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
            { expiresIn: '30d' }
        );

        // 박물관 유무 확인 → 프론트엔드가 리다이렉트 결정에 사용
        const { rows: siteRows } = await db.query(
            'SELECT subdomain FROM family_sites WHERE user_id = $1 LIMIT 1',
            [user.id]
        );
        const hasMuseum  = siteRows.length > 0;
        const subdomain  = siteRows[0]?.subdomain ?? null;

        res.cookie('orgcell_token', jwtToken, COOKIE_OPTIONS);
        res.json({
            success: true,
            hasMuseum,
            subdomain,
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
