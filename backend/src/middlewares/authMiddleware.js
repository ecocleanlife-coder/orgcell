const jwt = require('jsonwebtoken');

// Optional auth — sets req.user if token present, but never blocks
exports.optionalAuth = (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (header && header.startsWith('Bearer ')) {
            const token = header.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded.user;
            }
        }
    } catch { /* token invalid or missing — proceed as guest */ }
    next();
};

exports.protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const parts = req.headers.authorization.split(' ');
        token = parts.length === 2 ? parts[1] : null;
    }

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
