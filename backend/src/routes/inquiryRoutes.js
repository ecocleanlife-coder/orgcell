const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Rate limit: max 3 per IP per hour
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

// @desc    Submit app build inquiry
// @route   POST /api/inquiry
router.post('/', async (req, res) => {
    try {
        const { email, description, similarApps } = req.body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Valid email required' });
        }
        if (!description || description.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'Description must be at least 10 characters' });
        }

        // Rate limiting by IP
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const attempts = rateLimitMap.get(ip) || [];
        const recent = attempts.filter(t => now - t < 60 * 60 * 1000);
        if (recent.length >= 3) {
            return res.status(429).json({ success: false, message: 'Too many requests. Try again later.' });
        }
        recent.push(now);
        rateLimitMap.set(ip, recent);

        const ownerEmail = process.env.SMTP_USER || 'ecocleanlife@gmail.com';

        // Send notification to owner
        const transporter = getTransporter();
        await transporter.sendMail({
            from: `"Orgcell App Builder" <${ownerEmail}>`,
            to: ownerEmail,
            subject: `[New App Inquiry] from ${email}`,
            html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                    <h2 style="color: #7c3aed; margin-bottom: 4px;">New App Build Request</h2>
                    <p style="color: #666; font-size: 14px;">Submitted via orgcell.com</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #333; width: 120px;">Email:</td>
                            <td style="padding: 8px 0; color: #111;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #333; vertical-align: top;">Description:</td>
                            <td style="padding: 8px 0; color: #111; white-space: pre-wrap;">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #333; vertical-align: top;">Similar Apps:</td>
                            <td style="padding: 8px 0; color: #111; white-space: pre-wrap;">${(similarApps || 'None provided').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                        </tr>
                    </table>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
                    <p style="color: #999; font-size: 12px;">Base price: $100 | Review and respond with final quote.</p>
                </div>
            `,
        });

        // Send confirmation to customer
        await transporter.sendMail({
            from: `"Orgcell" <${ownerEmail}>`,
            to: email,
            subject: 'Your App Build Request - Received!',
            html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                    <h1 style="font-size: 24px; font-weight: 800; color: #111;">Thank you!</h1>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        We've received your app build request. Our team will review your requirements and get back to you with a detailed quote within 24 hours.
                    </p>
                    <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0; font-size: 14px; color: #666;">Base price starts at <strong style="color: #111;">$100</strong>. Final pricing depends on scope.</p>
                    </div>
                    <p style="color: #999; font-size: 13px;">— Orgcell Team</p>
                </div>
            `,
        });

        res.json({ success: true, message: 'Inquiry submitted successfully' });
    } catch (error) {
        console.error('Inquiry submission error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit inquiry' });
    }
});

module.exports = router;
