const request = require('supertest');
const express = require('express');
const { authLimiter } = require('../middlewares/rateLimiter');

describe('Rate Limiter', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use('/api/auth', authLimiter);
        app.post('/api/auth/test', (req, res) => res.json({ ok: true }));
    });

    it('should allow requests under limit', async () => {
        const res = await request(app).post('/api/auth/test');
        expect(res.status).toBe(200);
        expect(res.headers['ratelimit-limit']).toBe('10');
    });

    it('should block requests over limit', async () => {
        // Send 11 requests (limit is 10)
        for (let i = 0; i < 10; i++) {
            await request(app).post('/api/auth/test');
        }
        const res = await request(app).post('/api/auth/test');
        expect(res.status).toBe(429);
        expect(res.body.error).toMatch(/Too many/);
    });
});
