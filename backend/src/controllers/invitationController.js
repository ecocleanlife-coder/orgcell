/**
 * invitationController.js — §17 초대 시스템 (invitations 테이블)
 *
 * 기존 inviteController.js(family_invites 테이블)와 별도로 운영한다.
 *
 * 엔드포인트:
 *   POST   /api/invitations/:siteId          — 초대 생성
 *   GET    /api/invitations/:siteId          — 초대 이력 목록
 *   DELETE /api/invitations/:siteId/:id      — 초대 취소
 *   POST   /api/invitations/:siteId/:id/resend — 재초대 (만료 리셋)
 *   GET    /api/invitations/verify/:token    — 토큰 검증 (비로그인 접근)
 *   POST   /api/invitations/accept/:token    — 수락 (display_pref 저장)
 *   POST   /api/invitations/decline/:token   — 거절 → refused_persons 기록
 */

const db     = require('../config/db');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// ── 관계별 이메일 텍스트 ─────────────────────────────────────────────────────
const RELATION_TEXT = {
  family: {
    subject:    '가족유산박물관에 초대되었습니다',
    btnLabel:   '내 기록 확인하기',
    notice:     '이 초대는 가족 구성원으로 등록하기 위한 것입니다.',
    defaultMsg: '안녕하세요, 저희 가족 박물관에 당신의 소중한 기록을 남겨드리고 싶어 초대합니다.',
  },
  friend: {
    subject:    '가족유산박물관에 초대되었습니다',
    btnLabel:   '초대 수락하기',
    notice:     '',
    defaultMsg: '안녕하세요, 저희 가족 박물관을 방문하고 기록을 남겨주시면 감사하겠습니다.',
  },
  other: {
    subject:    '가족유산박물관에 초대되었습니다',
    btnLabel:   '초대 수락하기',
    notice:     '',
    defaultMsg: '안녕하세요, 처음 뵙겠습니다. 저희 가족 박물관에 초대합니다.',
  },
};

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
function generateToken() {
  return crypto.randomBytes(20).toString('hex');
}

function normalizeEmail(email) {
  return (email || '').replace(/[\r\n]/g, '').trim().toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/invitations/:siteId
// 초대 생성 — method(email|sms|link), relation, message, email/phone
// ═══════════════════════════════════════════════════════════════════════════════
exports.createInvitation = async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    const { method, relation, message, email, phone } = req.body;

    if (!siteId) return res.status(400).json({ success: false, message: 'siteId required' });
    if (!relation) return res.status(400).json({ success: false, message: 'relation required' });
    if (method === 'email' && !email) return res.status(400).json({ success: false, message: 'email required' });
    if (method === 'sms' && !phone) return res.status(400).json({ success: false, message: 'phone required' });

    const token           = generateToken();
    const normalizedEmail = email ? normalizeEmail(email) : null;
    const rel             = RELATION_TEXT[relation] || RELATION_TEXT.other;
    const finalMessage    = (message || '').trim() || rel.defaultMsg;

    const { rows } = await db.query(
      `INSERT INTO invitations
         (site_id, inviter_id, email, phone, token, method, relation, message, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '30 days')
       RETURNING id, token, expires_at`,
      [siteId, req.user.id, normalizedEmail, phone || null, token, method || 'link', relation, finalMessage],
    );

    const invitation = rows[0];

    // 이메일 발송
    if (method === 'email' && normalizedEmail) {
      const inviteUrl = `https://orgcell.com/invite/${token}`;
      const siteName  = await getSiteName(siteId);
      const inviterName = req.user.name || '관장';
      await sendInvitationEmail({
        to: normalizedEmail, inviteUrl, inviterName, siteName, relation, finalMessage, rel,
      });
    }

    res.json({
      success: true,
      data: {
        id:         invitation.id,
        token:      invitation.token,
        expires_at: invitation.expires_at,
        url:        `https://orgcell.com/invite/${invitation.token}`,
      },
    });
  } catch (err) {
    console.error('createInvitation error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/invitations/:siteId
// 초대 이력 목록
// ═══════════════════════════════════════════════════════════════════════════════
exports.listInvitations = async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);

    const { rows } = await db.query(
      `SELECT i.id, i.email, i.phone, i.method, i.relation, i.status,
              i.expires_at, i.created_at,
              u.name AS inviter_name
         FROM invitations i
         LEFT JOIN users u ON u.id = i.inviter_id
        WHERE i.site_id = $1
        ORDER BY i.created_at DESC
        LIMIT 100`,
      [siteId],
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listInvitations error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/invitations/:siteId/:id
// 초대 취소
// ═══════════════════════════════════════════════════════════════════════════════
exports.cancelInvitation = async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    const id     = parseInt(req.params.id, 10);

    const { rowCount } = await db.query(
      `UPDATE invitations SET status='cancelled', updated_at=NOW()
        WHERE id=$1 AND site_id=$2 AND status='pending'`,
      [id, siteId],
    );

    if (!rowCount) return res.status(404).json({ success: false, message: '취소할 초대를 찾을 수 없습니다' });
    res.json({ success: true });
  } catch (err) {
    console.error('cancelInvitation error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/invitations/:siteId/:id/resend
// 재초대 — 만료일 30일 연장 + 이메일 재발송
// ═══════════════════════════════════════════════════════════════════════════════
exports.resendInvitation = async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    const id     = parseInt(req.params.id, 10);

    const { rows } = await db.query(
      `UPDATE invitations
          SET status='pending', expires_at=NOW() + INTERVAL '30 days', updated_at=NOW()
        WHERE id=$1 AND site_id=$2
        RETURNING email, token, relation, message`,
      [id, siteId],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: '초대를 찾을 수 없습니다' });

    const inv = rows[0];
    if (inv.email) {
      const siteName    = await getSiteName(siteId);
      const inviterName = req.user.name || '관장';
      const rel         = RELATION_TEXT[inv.relation] || RELATION_TEXT.other;
      const inviteUrl   = `https://orgcell.com/invite/${inv.token}`;
      await sendInvitationEmail({
        to: inv.email, inviteUrl, inviterName, siteName, relation: inv.relation, finalMessage: inv.message, rel,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('resendInvitation error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/invitations/verify/:token
// 토큰 검증 — 비로그인 접근 가능
// ═══════════════════════════════════════════════════════════════════════════════
exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.params;

    const { rows } = await db.query(
      `SELECT i.id, i.relation, i.message, i.status, i.expires_at,
              fs.title AS museum_name, fs.subdomain,
              u.name   AS inviter_name
         FROM invitations i
         JOIN family_sites fs ON fs.id = i.site_id
         LEFT JOIN users u    ON u.id  = i.inviter_id
        WHERE i.token = $1`,
      [token],
    );

    if (!rows.length) return res.status(404).json({ success: false, message: '초대 링크를 찾을 수 없습니다' });

    const inv = rows[0];
    if (inv.status === 'cancelled') return res.status(410).json({ success: false, message: '취소된 초대입니다' });
    if (inv.status === 'accepted')  return res.status(410).json({ success: false, message: '이미 수락된 초대입니다' });
    if (inv.status === 'declined')  return res.status(410).json({ success: false, message: '이미 처리된 초대입니다' });
    if (new Date(inv.expires_at) < new Date()) {
      await db.query(`UPDATE invitations SET status='expired' WHERE token=$1`, [token]);
      return res.status(410).json({ success: false, message: '만료된 초대입니다' });
    }

    res.json({
      success: true,
      data: {
        relation:    inv.relation,
        message:     inv.message,
        museumName:  inv.museum_name,
        subdomain:   inv.subdomain,
        inviterName: inv.inviter_name,
      },
    });
  } catch (err) {
    console.error('verifyToken error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/invitations/accept/:token
// 수락 — display_pref 저장 + Visitor Pass 발급
// ═══════════════════════════════════════════════════════════════════════════════
exports.acceptInvitation = async (req, res) => {
  try {
    const { token }       = req.params;
    const { displayPref } = req.body;

    const { rows } = await db.query(
      `UPDATE invitations
          SET status='accepted', display_pref=$1, updated_at=NOW()
        WHERE token=$2 AND status='pending' AND expires_at > NOW()
        RETURNING site_id`,
      [displayPref || 'full', token],
    );

    if (!rows.length) return res.status(410).json({ success: false, message: '처리할 수 없는 초대입니다' });

    const siteId = rows[0].site_id;

    // site_members에 visitor 권한 추가 (이미 있으면 무시)
    if (req.user) {
      await db.query(
        `INSERT INTO site_members (site_id, user_id, role, status)
         VALUES ($1, $2, 'visitor', 'active')
         ON CONFLICT (site_id, user_id) DO NOTHING`,
        [siteId, req.user.id],
      );
    }

    const { rows: siteRows } = await db.query(
      `SELECT subdomain FROM family_sites WHERE id=$1`, [siteId],
    );

    res.json({ success: true, subdomain: siteRows[0]?.subdomain });
  } catch (err) {
    console.error('acceptInvitation error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/invitations/decline/:token
// 거절 → refused_persons 기록
// ═══════════════════════════════════════════════════════════════════════════════
exports.declineInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    const { rows } = await db.query(
      `UPDATE invitations
          SET status='declined', updated_at=NOW()
        WHERE token=$1 AND status='pending'
        RETURNING id, site_id`,
      [token],
    );

    if (!rows.length) return res.status(410).json({ success: false, message: '처리할 수 없는 초대입니다' });

    const { id: invitationId, site_id: siteId } = rows[0];

    await db.query(
      `INSERT INTO refused_persons (site_id, invitation_id) VALUES ($1, $2)`,
      [siteId, invitationId],
    );

    res.json({ success: true });
  } catch (err) {
    console.error('declineInvitation error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

async function getSiteName(siteId) {
  const { rows } = await db.query(`SELECT title FROM family_sites WHERE id=$1`, [siteId]);
  return rows[0]?.title || '가족유산박물관';
}

async function sendInvitationEmail({ to, inviteUrl, inviterName, siteName, relation, finalMessage, rel }) {
  try {
    const { getGmailTransporter } = emailService;
    const transporter = await getGmailTransporter();
    await transporter.sendMail({
      from:    '"Orgcell" <noreply@orgcell.com>',
      to,
      subject: `[Orgcell] ${inviterName}님이 ${siteName}에 초대했습니다`,
      html: buildInviteHtml({ inviteUrl, inviterName, siteName, relation, finalMessage, rel }),
    });
  } catch (err) {
    // 이메일 실패는 초대 생성을 막지 않음
    console.error('[invitationController] email send failed:', err.message);
  }
}

function buildInviteHtml({ inviteUrl, inviterName, siteName, finalMessage, rel }) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
      <h2 style="font-size:20px;color:#3a2a1a;margin-bottom:8px;">가족유산박물관 초대장</h2>
      <p style="color:#555;font-size:15px;line-height:1.7;margin-bottom:8px;">
        <strong>${inviterName}</strong>님이 <strong>${siteName}</strong>에 초대했습니다.
      </p>
      ${finalMessage ? `<p style="color:#7a6040;font-size:14px;line-height:1.7;background:#FDF8F0;padding:12px 16px;border-radius:8px;border-left:3px solid #C4A882;margin-bottom:24px;">${finalMessage}</p>` : ''}
      <a href="${inviteUrl}"
         style="display:inline-block;padding:14px 36px;background:#8B7355;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
        ${rel.btnLabel} →
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;line-height:1.8;">
        이 초대 링크는 30일간 유효합니다.<br/>
        직접 접속: <a href="${inviteUrl}" style="color:#C4A882;">${inviteUrl}</a>
      </p>
    </div>
  `;
}
