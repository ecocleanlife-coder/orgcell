require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

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

// 404 handler for /api/*
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
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
