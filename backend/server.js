require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
// Stripe webhook needs raw body — must come BEFORE express.json()
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// CSRF protection (CWE-352)
app.use('/api', require('./src/middlewares/csrfProtection'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'orgcell-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/photos', require('./src/routes/photoRoutes'));
app.use('/api/albums', require('./src/routes/albumRoutes'));
app.use('/api/face', require('./src/routes/faceRoutes'));
app.use('/api/rooms', require('./src/routes/roomRoutes'));
app.use('/api/drive', require('./src/routes/driveRoutes'));
app.use('/api/scan', require('./src/routes/scanRoutes'));
app.use('/api/sites', require('./src/routes/siteRoutes'));
app.use('/api/events', require('./src/routes/eventRoutes'));
app.use('/api/sharing', require('./src/routes/sharingRoutes'));
app.use('/api/inquiry', require('./src/routes/inquiryRoutes'));
app.use('/api/newsletter', require('./src/routes/newsletterRoutes'));
app.use('/api/payment', require('./src/routes/paymentRoutes'));
app.use('/api/domain', require('./src/routes/domainRoutes'));
app.use('/api/family', require('./src/routes/familyRoutes'));
app.use('/api/referral', require('./src/routes/referralRoutes'));
app.use('/api/subscriptions', require('./src/routes/subscriptionRoutes'));
app.use('/api/invite', require('./src/routes/inviteRoutes'));
app.use('/api/museum', require('./src/routes/museumRoutes'));
app.use('/api/manifest', require('./src/routes/manifestRoutes'));
app.use('/api/exhibitions', require('./src/routes/exhibitionRoutes'));
app.use('/api/calendar', require('./src/routes/calendarRoutes'));
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));
app.use('/api/board', require('./src/routes/boardRoutes'));
app.use('/api/persons', require('./src/routes/personRoutes'));

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
