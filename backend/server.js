require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(cookieParser());
// Stripe webhook needs raw body — must come BEFORE express.json()
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// CSRF protection (CWE-352)
app.use('/api', require('./src/middlewares/csrfProtection'));

// Rate limiting (CWE-770)
const { generalLimiter, authLimiter, uploadLimiter } = require('./src/middlewares/rateLimiter');
app.use('/api/auth', authLimiter);
app.use('/api/photos', uploadLimiter);
app.use('/api/drive/upload', uploadLimiter);
app.use('/api/sharing/upload', uploadLimiter);
app.use('/api', generalLimiter);

// Health check — 강화 버전 (DB + 라우트 + 메모리)
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'ok',
        service: 'orgcell-api',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        routes: { loaded: 0, failed: 0, failedList: [] },
        db: 'unknown',
    };

    // 라우트 상태 (서버 시작 후 변수 참조)
    if (typeof loadedRoutes !== 'undefined') {
        health.routes.loaded = loadedRoutes.length;
        health.routes.failed = failedRoutes.length;
        health.routes.failedList = failedRoutes.map(r => r.file);
    }

    // DB 연결 확인
    try {
        const pool = require('./src/config/db');
        const result = await pool.query('SELECT 1 AS ok');
        health.db = result.rows[0]?.ok === 1 ? 'connected' : 'error';
    } catch (err) {
        health.db = 'disconnected';
        health.status = 'degraded';
    }

    if (health.routes.failed > 0) {
        health.status = 'degraded';
    }

    const httpCode = health.status === 'ok' ? 200 : 503;
    res.status(httpCode).json(health);
});

// Routes — 자동 등록 + 수동 매핑 (라우트 파일 누락 시 서버 크래시 방지)
const ROUTE_MAP = {
    'authRoutes': '/api/auth',
    'photoRoutes': '/api/photos',
    'albumRoutes': '/api/albums',
    'faceRoutes': '/api/face',
    'roomRoutes': '/api/rooms',
    'driveRoutes': '/api/drive',
    'oneDriveRoutes': '/api/onedrive',
    'dropboxRoutes': '/api/dropbox',
    'scanRoutes': '/api/scan',
    'siteRoutes': '/api/sites',
    'eventRoutes': '/api/events',
    'sharingRoutes': '/api/sharing',
    'inquiryRoutes': '/api/inquiry',
    'newsletterRoutes': '/api/newsletter',
    'paymentRoutes': '/api/payment',
    'domainRoutes': '/api/domain',
    'familyRoutes': '/api/family',
    'referralRoutes': '/api/referral',
    'subscriptionRoutes': '/api/subscriptions',
    'inviteRoutes': '/api/invite',
    'museumRoutes': '/api/museum',
    'manifestRoutes': '/api/manifest',
    'exhibitionRoutes': '/api/exhibitions',
    'calendarRoutes': '/api/calendar',
    'boardRoutes': '/api/board',
    'personRoutes': '/api/persons',
    'relationRoutes': '/api/persons',
    'federationRoutes': '/api/federation',
    'friendRoutes': '/api/friends',
    'heritageRoutes': '/api/heritage',
    'familySearchRoutes': '/api/familysearch',
    'inboxRoutes': '/api/inbox',
};

const routesDir = path.join(__dirname, 'src', 'routes');
const loadedRoutes = [];
const failedRoutes = [];

Object.entries(ROUTE_MAP).forEach(([file, mountPath]) => {
    const filePath = path.join(routesDir, `${file}.js`);
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        app.use(mountPath, require(filePath));
        loadedRoutes.push({ file, mountPath });
    } catch (err) {
        failedRoutes.push({ file, mountPath, error: err.message });
        console.error(`⚠️ Route load failed: ${file} → ${mountPath} — ${err.message}`);
    }
});

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log(`✅ Routes loaded: ${loadedRoutes.length}/${Object.keys(ROUTE_MAP).length}`);
if (failedRoutes.length > 0) {
    console.error(`❌ Failed routes (${failedRoutes.length}):`, failedRoutes.map(r => r.file).join(', '));
}

// 404 handler for /api/*
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler — 프로덕션에서 스택트레이스 숨김 (CWE-200)
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
const http = require('http');
const server = http.createServer(app);

// Socket.IO for Friend Call relay
const { initRelay } = require('./src/services/relayService');
initRelay(server);

server.listen(PORT, () => {
    console.log(`Orgcell API + Relay running on port ${PORT}`);
});
