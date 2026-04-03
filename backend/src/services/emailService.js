const nodemailer = require('nodemailer');
const { getSecrets } = require('../config/secrets');

let resendTransporter = null;
let gmailTransporter = null;

async function getResendTransporter() {
    if (resendTransporter) return resendTransporter;
    const secrets = await getSecrets();
    resendTransporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
            user: 'resend',
            pass: secrets.RESEND_API_KEY,
        },
    });
    return resendTransporter;
}

async function getGmailTransporter() {
    if (gmailTransporter) return gmailTransporter;
    const secrets = await getSecrets();
    gmailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: secrets.SMTP_USER,
            pass: secrets.SMTP_PASS,
        },
    });
    return gmailTransporter;
}

/**
 * Send magic link email
 * @param {string} to - recipient email
 * @param {string} magicLink - full URL with token
 */
/**
 * Send payment confirmation email to customer
 */
exports.sendPaymentConfirmationEmail = async (to, { amountUsd, sessionId }) => {
    const transporter = await getResendTransporter();
    const amountDisplay = `$${(amountUsd / 100).toFixed(2)}`;
    const mailOptions = {
        from: '"Orgcell" <noreply@orgcell.com>',
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

                <div style="margin-top: 36px; padding: 20px; background: #f0f7e8; border-radius: 12px; text-align: left;">
                    <p style="font-weight: 700; font-size: 14px; color: #3a5a2a; margin: 0 0 10px;">📌 다음부터 접속하는 방법</p>
                    <ol style="margin: 0; padding-left: 20px; color: #4a6a3a; font-size: 13px; line-height: 2;">
                        <li>orgcell.com 접속</li>
                        <li>Google 로그인 클릭</li>
                        <li>바로 박물관으로 이동</li>
                    </ol>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #6a8a5a;">💡 브라우저에서 orgcell.com을 북마크 저장해 두시면 편리합니다.</p>
                </div>

                <div style="margin-top: 16px; padding: 16px 20px; background: #f8f4ec; border-radius: 12px; text-align: left;">
                    <p style="font-weight: 700; font-size: 14px; color: #5a4a2a; margin: 0 0 6px;">👨‍👩‍👧 가족 초대 방법</p>
                    <p style="margin: 0; font-size: 13px; color: #6a5a3a; line-height: 1.7;">박물관 설정 후 <strong>설정 탭 → 가족 초대하기</strong>에서 초대 링크를 생성하거나 이메일로 직접 초대할 수 있습니다.</p>
                </div>

                <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; line-height: 1.8;">
                    문의사항이 있으시면 itsconllc@gmail.com 으로 연락해 주세요.<br/>
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
    const transporter = await getResendTransporter();
    const amountDisplay = `$${(amountUsd / 100).toFixed(2)}`;
    const mailOptions = {
        from: '"Orgcell" <noreply@orgcell.com>',
        to: process.env.ADMIN_EMAIL || 'itsconllc@gmail.com',
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

/**
 * Send family invite email
 */
exports.sendInviteEmail = async ({ to, code, inviterName, subdomain }) => {
    const transporter = await getResendTransporter();
    const inviteUrl = `https://orgcell.com/privacy-choice?code=${code}`;
    const museumLabel = subdomain ? `orgcell.com/${subdomain}` : 'Orgcell';
    const mailOptions = {
        from: '"Orgcell" <noreply@orgcell.com>',
        to,
        subject: `[Orgcell] ${inviterName}님이 가족 박물관에 초대했습니다`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 26px; font-weight: 800; color: #111; margin-bottom: 4px;">Orgcell</h1>
                <p style="color: #888; font-size: 13px; margin-top: 0; margin-bottom: 32px;">디지털 가족 박물관</p>

                <h2 style="font-size: 20px; color: #3a3a2a; margin-bottom: 8px;">가족 박물관 초대장</h2>
                <p style="color: #555; font-size: 15px; line-height: 1.7; margin-bottom: 28px;">
                    <strong>${inviterName}</strong>님이 <strong>${museumLabel}</strong> 가족 박물관에 초대했습니다.<br/>
                    아래 버튼을 눌러 박물관에서의 노출 방식을 선택하세요.
                </p>

                <a href="${inviteUrl}"
                   style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #C4A84F, #A88E3A); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px;">
                    초대 확인하기 →
                </a>

                <div style="margin-top: 28px; padding: 16px; background: #f8f4ec; border-radius: 12px; border: 1px solid #e8e0d0;">
                    <p style="margin: 0; font-size: 13px; color: #5a4a2a; line-height: 1.7;">
                        🔒 <strong>개인정보 보호</strong><br/>
                        링크를 클릭하면 박물관 노출 여부를 직접 선택할 수 있습니다.<br/>
                        원하지 않으시면 노출을 거절하실 수 있으며, 개인정보는 철저히 보호됩니다.
                    </p>
                </div>

                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; line-height: 1.8;">
                    이 초대 링크는 30일간 유효합니다.<br/>
                    초대를 원하지 않으시면 이 이메일을 무시하세요.<br/>
                    직접 접속: <a href="${inviteUrl}" style="color: #C4A84F; word-break: break-all;">${inviteUrl}</a>
                </p>
            </div>
        `,
    };

    // 재시도 로직: 429 rate limit 시 3초 후 1회 재시도
    try {
        return await transporter.sendMail(mailOptions);
    } catch (error) {
        const statusCode = error.responseCode || error.statusCode;
        console.error(`[emailService] sendInviteEmail failed: to=${to}, code=${statusCode}, message=${error.message}`);

        if (statusCode === 429) {
            console.warn('[emailService] Rate limit hit, retrying in 3 seconds...');
            await new Promise(r => setTimeout(r, 3000));
            try {
                return await transporter.sendMail(mailOptions);
            } catch (retryError) {
                console.error(`[emailService] Retry also failed: ${retryError.message}`);
                const err = new Error('이메일 발송 제한. 잠시 후 다시 시도해주세요.');
                err.statusCode = 429;
                throw err;
            }
        }
        throw error;
    }
};

exports.sendMagicLinkEmail = async (to, magicLink) => {
    const transporter = await getResendTransporter();
    const mailOptions = {
        from: '"Orgcell" <noreply@orgcell.com>',
        to,
        subject: '[Orgcell] 로그인 링크',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 28px; font-weight: 800; color: #111; margin-bottom: 4px;">Orgcell</h1>
                <p style="color: #888; font-size: 13px; margin-top: 0; margin-bottom: 32px;">디지털 가족 박물관</p>
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                    아래 버튼을 눌러 로그인하세요.<br/>
                    이 링크는 <strong>15분간</strong> 유효하며, 한 번만 사용할 수 있습니다.
                </p>
                <a href="${magicLink}"
                   style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: linear-gradient(135deg, #7C5CFC, #6A4AE0); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">
                    Orgcell 로그인하기 →
                </a>
                <p style="color: #999; font-size: 13px; margin-top: 32px;">
                    본인이 요청하지 않았다면 이 이메일을 무시하세요.<br/>
                    직접 접속: <a href="${magicLink}" style="color: #7C5CFC; word-break: break-all;">${magicLink}</a>
                </p>
            </div>
        `,
    };

    try {
        const result = await transporter.sendMail(mailOptions);
        return result;
    } catch (error) {
        console.error('Email send failed:', error.message, error.code, error.response);
        throw error;
    }
};

/**
 * Send access request notification to museum owner
 */
exports.sendAccessRequestEmail = async ({ to, requesterName, personName, message }) => {
    const transporter = await getResendTransporter();
    const mailOptions = {
        from: '"Orgcell" <noreply@orgcell.com>',
        to,
        subject: `[Orgcell] ${requesterName}님이 전시관 접근을 요청했습니다`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 26px; font-weight: 800; color: #111; margin-bottom: 4px;">Orgcell</h1>
                <p style="color: #888; font-size: 13px; margin-top: 0; margin-bottom: 32px;">디지털 가족 박물관</p>

                <h2 style="font-size: 20px; color: #3a3a2a; margin-bottom: 8px;">전시관 접근 요청</h2>
                <p style="color: #555; font-size: 15px; line-height: 1.7; margin-bottom: 20px;">
                    <strong>${requesterName}</strong>님이 <strong>${personName}</strong>의 전시관 접근을 요청했습니다.
                </p>

                ${message ? `
                <div style="padding: 16px; background: #f8f4ec; border-radius: 12px; border: 1px solid #e8e0d0; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 13px; color: #5a4a2a; line-height: 1.7;">
                        💬 <strong>요청 메시지:</strong><br/>${message}
                    </p>
                </div>
                ` : ''}

                <a href="https://orgcell.com"
                   style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #C4A84F, #A88E3A); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px;">
                    박물관에서 확인하기 →
                </a>

                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; line-height: 1.8;">
                    박물관 관리 페이지에서 승인 또는 거절할 수 있습니다.
                </p>
            </div>
        `,
    };
    return transporter.sendMail(mailOptions);
};

exports.getGmailTransporter = getGmailTransporter;
