const rateLimit = require('express-rate-limit');

// 일반 API: 15분에 100회
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests', retryAfter: '15분 후 다시 시도해주세요' },
});

// 인증 API: 15분에 10회
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: { success: false, error: 'Too many auth requests', retryAfter: '15분 후 다시 시도해주세요' },
});

// 파일 업로드: 1시간에 20회
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many uploads', retryAfter: '1시간 후 다시 시도해주세요' },
});

module.exports = { generalLimiter, authLimiter, uploadLimiter };
