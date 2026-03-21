// CSRF 보호: Origin/Referer 헤더 검증 (CWE-352)
// POST/PUT/DELETE 요청에서 Origin이 FRONTEND_URL과 일치하는지 확인

const csrfProtection = (req, res, next) => {
    // GET, HEAD, OPTIONS 요청은 통과
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const allowedOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // Origin 헤더가 있으면 검증
    if (origin) {
        if (origin.replace(/\/$/, '') === allowedOrigin) {
            return next();
        }
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Origin이 없으면 Referer로 대체 검증
    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (refererOrigin === allowedOrigin) {
                return next();
            }
        } catch {
            // malformed referer
        }
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Origin/Referer 모두 없는 경우 (서버 간 API 호출, Stripe webhook 등)
    // Bearer 토큰이 있으면 허용 (API 클라이언트)
    if (req.headers.authorization) {
        return next();
    }

    return res.status(403).json({ success: false, message: 'Forbidden' });
};

module.exports = csrfProtection;
