const rateLimit = require('express-rate-limit');

// 일반 API: 15분에 200회
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests', retryAfter: '15분 후 다시 시도해주세요' },
});

// 로그인 시도: 15분에 10회 (google, magic-link, dev-login만 적용)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts', retryAfter: '15분 후 다시 시도해주세요' },
});

// /api/auth/me: 1분에 30회 (페이지 로드마다 호출되므로 넉넉하게)
const authMeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many auth checks', retryAfter: '1분 후 다시 시도해주세요' },
});

// 파일 업로드: 1시간에 20회
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many uploads', retryAfter: '1시간 후 다시 시도해주세요' },
});

module.exports = { generalLimiter, loginLimiter, authMeLimiter, uploadLimiter };
