const nodemailer = require('nodemailer');

// Gmail SMTP (uses app password) or any SMTP provider
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send magic link email
 * @param {string} to - recipient email
 * @param {string} magicLink - full URL with token
 */
exports.sendMagicLinkEmail = async (to, magicLink) => {
    const mailOptions = {
        from: `"Orgcell" <${process.env.SMTP_USER || 'noreply@orgcell.com'}>`,
        to,
        subject: 'Orgcell Login Link',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 28px; font-weight: 800; color: #111; margin-bottom: 8px;">Orgcell</h1>
                <p style="color: #666; margin-bottom: 32px;">AI Family Photo Platform</p>
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                    Click the button below to log in. This link expires in <strong>15 minutes</strong> and can only be used once.
                </p>
                <a href="${magicLink}"
                   style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
                    Log in to Orgcell
                </a>
                <p style="color: #999; font-size: 13px; margin-top: 32px;">
                    If you didn't request this, you can safely ignore this email.<br/>
                    Link: <a href="${magicLink}" style="color: #7c3aed; word-break: break-all;">${magicLink}</a>
                </p>
            </div>
        `,
    };

    return transporter.sendMail(mailOptions);
};
