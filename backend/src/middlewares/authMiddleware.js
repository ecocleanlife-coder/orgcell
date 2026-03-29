const jwt = require('jsonwebtoken');

/**
 * 토큰 추출: httpOnly 쿠키 우선, Authorization 헤더 폴백
 */
function extractToken(req) {
    // 1. httpOnly 쿠키 (보안 우선)
    if (req.cookies?.orgcell_token) {
        return req.cookies.orgcell_token;
    }
    // 2. Authorization 헤더 폴백 (모바일 앱 등)
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        const token = header.split(' ')[1];
        if (token) return token;
    }
    return null;
}

// Optional auth — sets req.user if token present, but never blocks
exports.optionalAuth = (req, res, next) => {
    try {
        const token = extractToken(req);
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded.user;
        }
    } catch { /* token invalid or missing — proceed as guest */ }
    next();
};

exports.protect = (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
    }
};
