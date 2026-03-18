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
/**
 * Send payment confirmation email to customer
 */
exports.sendPaymentConfirmationEmail = async (to, { amountUsd, sessionId }) => {
    const amountDisplay = `$${(amountUsd / 100).toFixed(2)}`;
    const mailOptions = {
        from: `"Orgcell" <${process.env.SMTP_USER || 'noreply@orgcell.com'}>`,
        to,
        subject: '[Orgcell] 결제가 완료되었습니다 🎉',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 26px; font-weight: 800; color: #111; margin-bottom: 4px;">Orgcell</h1>
                <p style="color: #888; font-size: 13px; margin-top: 0; margin-bottom: 32px;">디지털 가족 박물관</p>

                <h2 style="font-size: 20px; color: #16a34a; margin-bottom: 24px;">결제가 완료되었습니다 🎉</h2>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">결제 금액</td>
                        <td style="padding: 12px 0; font-weight: 700; font-size: 14px; text-align: right;">${amountDisplay}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">구독 기간</td>
                        <td style="padding: 12px 0; font-weight: 700; font-size: 14px; text-align: right;">1년</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">결제 ID</td>
                        <td style="padding: 12px 0; font-size: 12px; color: #9ca3af; text-align: right;">${sessionId}</td>
                    </tr>
                </table>

                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
                    이제 나만의 가족 박물관을 만들 수 있습니다.<br/>
                    아래 버튼을 눌러 박물관 설정을 시작하세요.
                </p>

                <a href="https://orgcell.com/family-setup"
                   style="display: inline-block; padding: 14px 32px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px;">
                    박물관 설정 시작하기 →
                </a>

                <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; line-height: 1.8;">
                    문의사항이 있으시면 ecocleanlife@gmail.com 으로 연락해 주세요.<br/>
                    © Orgcell
                </p>
            </div>
        `,
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send new payment notification to admin
 */
exports.sendAdminPaymentNotification = async ({ email, amountUsd, paidAt }) => {
    const amountDisplay = `$${(amountUsd / 100).toFixed(2)}`;
    const mailOptions = {
        from: `"Orgcell" <${process.env.SMTP_USER || 'noreply@orgcell.com'}>`,
        to: 'ecocleanlife@gmail.com',
        subject: '[Orgcell] 새 결제 발생',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
                <h2 style="font-size: 18px; color: #111; margin-bottom: 20px;">새 결제가 발생했습니다</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">결제 이메일</td>
                        <td style="padding: 10px 0; font-weight: 600; font-size: 14px;">${email}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">결제 금액</td>
                        <td style="padding: 10px 0; font-weight: 600; font-size: 14px;">${amountDisplay}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">결제 시각</td>
                        <td style="padding: 10px 0; font-size: 14px;">${paidAt}</td>
                    </tr>
                </table>
            </div>
        `,
    };
    return transporter.sendMail(mailOptions);
};

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
