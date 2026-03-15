const express = require('express');
const router = express.Router();
const db = require('../config/db');
const nodemailer = require('nodemailer');

// Rate limit: max 3 attempts per IP per hour
const rateLimitMap = new Map();

function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// @desc  Subscribe to newsletter
// @route POST /api/newsletter
router.post('/', async (req, res) => {
    try {
        const { email, ref } = req.body;

        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: '유효한 이메일 주소를 입력해 주세요.' });
        }

        // Rate limiting by IP
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const attempts = rateLimitMap.get(ip) || [];
        const recent = attempts.filter(t => now - t < 60 * 60 * 1000);
        if (recent.length >= 3) {
            return res.status(429).json({ success: false, message: '잠시 후 다시 시도해 주세요.' });
        }
        recent.push(now);
        rateLimitMap.set(ip, recent);

        // Auto-create table if not exists (idempotent)
        await db.query(`
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                ref VARCHAR(100),
                confirmed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check for duplicate
        const existing = await db.query(
            'SELECT id FROM newsletter_subscribers WHERE email = $1',
            [email.toLowerCase()]
        );
        if (existing.rows.length > 0) {
            return res.json({ success: true, message: '이미 구독 중인 이메일입니다. 감사합니다!' });
        }

        // Save subscriber
        await db.query(
            'INSERT INTO newsletter_subscribers (email, ref, confirmed) VALUES ($1, $2, FALSE)',
            [email.toLowerCase(), ref || null]
        );

        // Send confirmation email (best-effort)
        const ownerEmail = process.env.SMTP_USER;
        if (ownerEmail) {
            const transporter = getTransporter();
            await transporter.sendMail({
                from: `"Orgcell" <${ownerEmail}>`,
                to: email,
                subject: '소식 구독 완료 — Orgcell',
                html: `
                    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                        <h1 style="font-size: 26px; font-weight: 800; color: #1E2A0E; margin-bottom: 4px;">Orgcell</h1>
                        <p style="color: #5a6a4a; font-size: 14px; margin-bottom: 28px;">AI 가족 사진 정리 플랫폼</p>
                        <p style="color: #333; font-size: 16px; line-height: 1.7;">
                            구독해 주셔서 감사합니다! 🎉<br/>
                            신기능 출시와 업데이트 소식을 가장 먼저 전해드리겠습니다.
                        </p>
                        <div style="background: #f0f7e8; border-radius: 14px; padding: 18px 20px; margin: 28px 0; border: 1px solid #c8d8a8;">
                            <p style="margin: 0; font-size: 14px; color: #3a5a3a; line-height: 1.6;">
                                📌 ksarang.org에서 <strong>5명을 추천</strong>하면 Family Website 1년 이용권을 무료로 드립니다.
                            </p>
                        </div>
                        <a href="https://orgcell.com/family-website"
                           style="display: inline-block; padding: 13px 28px; background: #4A7F4A; color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px;">
                            Family Website 살펴보기
                        </a>
                        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
                            스팸 없이 중요한 소식만 전달합니다. 언제든 구독 취소 가능합니다.
                        </p>
                    </div>
                `,
            }).catch(err => console.warn('Newsletter confirmation email failed:', err.message));
        }

        res.json({ success: true, message: '구독 완료! 곧 소식 전해드릴게요 🎉' });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }
});

module.exports = router;
