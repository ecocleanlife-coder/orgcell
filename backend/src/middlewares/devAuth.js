/**
 * devAuth.js — 개발 전용 자동 인증 미들웨어
 *
 * ⚠️  NODE_ENV=production 또는 DEV_AUTO_LOGIN≠true 시 완전 비활성화
 * ⚠️  운영 서버에 절대 포함 금지
 */

const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { generateOcId } = require('../utils/ocIdGenerator');

const IS_DEV = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTO_LOGIN === 'true';

// 모듈 로드 시점에 dev 토큰을 저장 (seedDevEnvironment 완료 후 채워짐)
let _devToken = null;
let _devUser  = null;

const COOKIE_OPT = {
    httpOnly: true,
    secure: false,   // 로컬 http
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
};

/**
 * 서버 시작 시 1회 호출 — dev 유저 + 박물관 시딩
 */
async function seedDevEnvironment() {
    if (!IS_DEV) return;

    const DEV_EMAIL     = process.env.DEV_USER_EMAIL || 'dev@orgcell.com';
    const DEV_SUBDOMAIN = process.env.DEV_SUBDOMAIN  || 'han';
    const DEV_GID       = 'dev_orgcell_local_2026';

    try {
        // 1. 유저 upsert (google_id or email 충돌 모두 처리)
        const { rows: [user] } = await db.query(`
            INSERT INTO users (google_id, email, name)
            VALUES ($1, $2, '개발자')
            ON CONFLICT (google_id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
            RETURNING id, email, name
        `, [DEV_GID, DEV_EMAIL]).catch(async () => {
            // email unique 충돌 → 이메일로 직접 조회
            return db.query(
                `SELECT id, email, name FROM users WHERE email = $1 LIMIT 1`,
                [DEV_EMAIL]
            );
        });

        // 2. 박물관(family_site) upsert
        const { rows: [site] } = await db.query(`
            INSERT INTO family_sites (user_id, subdomain, theme, status)
            VALUES ($1, $2, 'modern', 'active')
            ON CONFLICT (subdomain) DO NOTHING
            RETURNING id, subdomain
        `, [user.id, DEV_SUBDOMAIN]);

        const siteId = site?.id ?? (await db.query(
            `SELECT id FROM family_sites WHERE subdomain = $1`, [DEV_SUBDOMAIN]
        )).rows[0]?.id;

        // 3. 관장 person — 없으면 생성
        const { rows: existing } = await db.query(
            `SELECT id FROM persons WHERE site_id = $1 AND match_status = 'linked' LIMIT 1`,
            [siteId]
        );
        if (!existing.length) {
            // OPS 필수: person_id는 INSERT 시점에 반드시 설정
            const devOcId = await generateOcId(db.pool || db, 'KR');
            await db.query(`
                INSERT INTO persons (site_id, name, match_status, user_id, oc_id, person_id)
                VALUES ($1, '개발자', 'linked', $2, $3, $3)
            `, [siteId, user.id, devOcId]);
        }

        // 4. 장기 JWT 생성
        _devUser  = { id: user.id, email: user.email, name: user.name };
        _devToken = jwt.sign({ user: _devUser }, process.env.JWT_SECRET, { expiresIn: '30d' });

        console.log(`🔧 [DEV] 자동 로그인 활성화: ${DEV_EMAIL} → /${DEV_SUBDOMAIN}/archive`);
    } catch (err) {
        console.error('🔧 [DEV] seedDevEnvironment 실패:', err.message);
    }
}

/**
 * 글로벌 미들웨어 — 쿠키 없는 요청에 dev JWT 자동 주입
 */
function devAuthMiddleware(req, res, next) {
    if (!IS_DEV || !_devToken) return next();

    // 이미 인증 쿠키 있으면 패스
    if (req.cookies?.orgcell_token) return next();

    // JWT 쿠키 주입 (브라우저가 저장 — 다음 요청부터 자동 전송)
    res.cookie('orgcell_token', _devToken, COOKIE_OPT);

    // req.cookies에도 직접 주입 → protect() 미들웨어가 이번 요청에서도 인식
    req.cookies = req.cookies || {};
    req.cookies.orgcell_token = _devToken;
    req.user = _devUser;

    next();
}

module.exports = { seedDevEnvironment, devAuthMiddleware };
