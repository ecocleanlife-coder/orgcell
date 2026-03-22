# Security Review Report
**orgcell Family Museum Backend & Frontend**
**Date: 2026-03-21**

**CRITICAL ISSUES: 1 | HIGH ISSUES: 3 | MEDIUM ISSUES: 2**

---

## CRITICAL ISSUE #1: Resource Enumeration via Different Error Messages

**Location:** `siteController.js:220-247` (`listMembers`)
**Severity:** CRITICAL

### Problem
The `listMembers` endpoint returns a 403 error when the user is not the owner, but returns 404 when the member is not found. This allows attackers to enumerate which site IDs exist in the system by observing different HTTP status codes.

**Vulnerable Code:**
```javascript
const site = await db.query(
    `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2`, [siteId, userId]
);
if (!site.rows.length) {
    return res.status(403).json({ success: false, message: 'Only owner can view members' });
}
```

### Attack Scenario
1. Attacker guesses `siteId = 42` and calls `GET /api/sites/42/members` with valid auth token
2. If they get 403, the site exists but they're not the owner
3. If they get 401/404, the site doesn't exist
4. By trying thousands of IDs, attacker maps all family sites in the system

### Recommendation
Return 404 for both missing sites and unauthorized access:
```javascript
if (!site.rows.length) {
    return res.status(404).json({ success: false, message: 'Site not found' });
}
```

---

## HIGH ISSUE #1: Email Injection via Missing Validation

**Location:** `inviteController.js:84-95` (`sendInviteEmailHandler`)
**Severity:** HIGH

### Problem
The `email` parameter has no format validation. Attackers can inject CRLF characters to manipulate email headers.

**Vulnerable Code:**
```javascript
const { email, code, subdomain } = req.body;
if (!email || !code) return res.status(400).json({ ... });
await sendInviteEmail({ to: email, code, inviterName: req.user?.name || 'Someone', subdomain });
```

### Attack Scenario
```json
POST /api/invite/send-email
{
  "email": "test@example.com\r\nBcc: attacker@example.com",
  "code": "ABC123",
  "subdomain": "family"
}
```
This could blind-copy the attacker on all invitation emails.

### Recommendation
Add regex validation:
```javascript
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
}
```

---

## HIGH ISSUE #2: Missing Member-Site Relationship Verification

**Location:** `siteController.js:249-281` (`updateMemberRole`)
**Severity:** HIGH

### Problem
The endpoint updates a member role without explicitly verifying that the `memberId` actually belongs to the `siteId` being updated.

**Vulnerable Code:**
```javascript
const { rows } = await db.query(
    `UPDATE site_members SET role = $1 WHERE id = $2 AND site_id = $3 RETURNING *`,
    [role, memberId, siteId]
);
if (!rows.length) {
    return res.status(404).json({ success: false, message: 'Member not found' });
}
```

**Issue:** The WHERE clause prevents cross-site updates (good), but there's no prior verification that `memberId` belongs to `siteId`. If two sites share the same member ID by coincidence, the generic error message hides the issue.

### Recommendation
Add explicit pre-check:
```javascript
const member = await db.query(
    `SELECT id FROM site_members WHERE id = $1 AND site_id = $2`,
    [memberId, siteId]
);
if (!member.rows.length) {
    return res.status(404).json({ success: false, message: 'Member not found in this site' });
}
// Now proceed with update
```

---

## HIGH ISSUE #3: No CSRF Protection on State-Changing Requests

**Location:** `FamilySetupPage.jsx:64, 104, 226`
**Severity:** HIGH

### Problem
Frontend sends POST/state-changing requests without CSRF tokens. If the backend lacks CSRF protection, attackers can forge requests.

**Vulnerable Calls:**
- Line 64: `axios.post('/api/sites', { subdomain })`
- Line 104: `axios.post('/api/invite/create', { site_id: createdSiteId })`

### Attack Scenario
1. Victim logs into `orgcell.com` (auth token in browser)
2. Attacker tricks victim to visit `evil.com`
3. `evil.com` sends an invisible AJAX request: `POST /api/sites { subdomain: "attacker-site" }`
4. If orgcell backend has no CSRF validation, the site is created under victim's account

### Recommendation

**Backend:** Implement CSRF middleware
```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// POST routes automatically validate _csrf token
```

**Frontend:** Include CSRF token in request headers
```javascript
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
axios.defaults.headers.post['X-CSRF-Token'] = csrfToken;
```

---

## MEDIUM ISSUE #1: Subdomain Not Validated on Backend

**Location:** `siteController.js:8-26`
**Severity:** MEDIUM

### Problem
Frontend sanitizes subdomain (`replace(/[^a-z0-9-]/g, '')`), but backend only lowercases it. Direct API calls can bypass frontend validation.

**Vulnerable Code:**
```javascript
const { subdomain, theme = 'modern' } = req.body;
// Only lowercased, not validated against pattern
[userId, subdomain.toLowerCase(), theme]
```

### Recommendation
Validate against regex:
```javascript
const subdomainRegex = /^[a-z0-9-]{3,30}$/;
if (!subdomainRegex.test(subdomain.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Invalid subdomain format' });
}
```

---

## MEDIUM ISSUE #2: Logging May Expose Sensitive Data

**Location:** `siteController.js:37, 84, etc.` (console.error calls)
**Severity:** MEDIUM

### Problem
Raw error objects are logged without redaction, potentially exposing query details, PII, or internal stack traces.

**Code:**
```javascript
console.error('createSite Error:', error);
```

### Recommendation
Use structured logging:
```javascript
console.error('createSite failed', {
    userId: req.user?.id,
    errorMessage: error.message
    // Don't log: error, error.stack, or full error object
});
```

---

## POSITIVE FINDINGS

✓ All database queries use parameterized queries (no SQL injection risk)
✓ Protected routes enforce `protect` middleware
✓ Owner-only actions verify ownership (mostly)
✓ Role values have whitelist check (`['member', 'admin']`)
✓ Password hashing uses bcryptjs
✓ Invite codes use cryptographically secure random generation

---

## PRIORITY FIX ORDER

1. **CRITICAL:** `listMembers` — Change 403 to 404
2. **HIGH:** `sendInviteEmailHandler` — Add email regex validation
3. **HIGH:** `updateMemberRole` — Add pre-check for member-site relationship
4. **HIGH:** Implement CSRF protection (backend + frontend)
5. **MEDIUM:** Backend subdomain validation
6. **MEDIUM:** Structured logging with redaction

---

## Files Reviewed

- `C:\ioc\orgcell\backend\src\controllers\siteController.js` (lines 220-310)
- `C:\ioc\orgcell\backend\src\controllers\inviteController.js` (all)
- `C:\ioc\orgcell\backend\src\routes\siteRoutes.js` (all)
- `C:\ioc\orgcell\backend\src\middlewares\authMiddleware.js` (verified protect middleware)
- `C:\ioc\orgcell\frontend\src\pages\museum\FamilySetupPage.jsx` (all)

---

**End of Report**
