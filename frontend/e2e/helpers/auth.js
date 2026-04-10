/**
 * e2e/helpers/auth.js — Playwright 인증 헬퍼 v2
 *
 * dev-login 대신 /api/auth/me + /api/museum/mine 직접 모킹.
 * NODE_ENV 무관, httpOnly 쿠키 공유 문제 완전 우회.
 *
 * MuseumPage 접근 조건 (MuseumPage.jsx 기준):
 *   - siteId  = m?.siteId ?? m?.site_id  ← museum 응답에 site_id 필수
 *   - personId = user?.personId ?? user?.person_id ← auth/me 응답에 person_id 필수
 */

const SITE_ID   = 1;
const PERSON_ID = 'KR-CURATOR';

// ── 신규 유저 (박물관 없음) ────────────────────────────────────────────────────
export async function mockAuthAsNewUser(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 1, email: 'new@test.com', name: '새 유저', role: 'user' },
      }),
    });
  });
  await page.route('**/api/museum/mine', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

// ── 관장 유저 (박물관 있음) ───────────────────────────────────────────────────
export async function mockAuthAsCurator(page, subdomain = 'test-museum', personId = PERSON_ID) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 1, email: 'curator@test.com', name: '관장', person_id: personId },
      }),
    });
  });
  await page.route('**/api/museum/mine', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [{ id: SITE_ID, subdomain }] }),
    });
  });
}

// ── 방문자 유저 (관장 아닌 인증 유저, person_id 있음) ─────────────────────────
export async function mockAuthAsVisitor(page, personId = 'KR-VISITOR') {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { id: 2, email: 'visitor@test.com', name: '방문자', person_id: personId },
      }),
    });
  });
  await page.route('**/api/museum/mine', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

// ── 공통 박물관 API 모킹 ──────────────────────────────────────────────────────
export async function mockMuseumAPIs(page, subdomain, {
  siteId   = SITE_ID,
  personId = PERSON_ID,
  allowed  = true,
  nodes    = [],
} = {}) {
  await page.route(`**/api/museum/${subdomain}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // MuseumPage.jsx: `const m = data.museum ?? data` — return flat object so m=data has site_id
      body: JSON.stringify({ id: siteId, site_id: siteId, subdomain, display_name: `${subdomain} 가족유산박물관`, owner_person_id: personId }),
    });
  });

  await page.route(`**/api/tree/${subdomain}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, nodes, connectors: [], meta: {}, curatorId: personId }),
    });
  });

  // 입장권 체크 — 와일드카드로 personId 무관하게 처리
  await page.route('**/api/access/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, allowed }),
    });
  });

  // 전시관 목록
  await page.route('**/api/exhibitions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

// ── 트리 노드 빌더 (CoupleBlock 요구 형식 준수) ───────────────────────────────
// FamilyTreeCanvas: buildCoupleGroups(nodes) → CoupleBlock
// CoupleBlock: node.coupleId, node.coupleRole('left'|'right'|'single'), node.coupleBlockX
// FolderCard:  node.personId, node.name, node.matchStatus, node.animOrder
export function makeSingleNode(personId = PERSON_ID, name = '이관장', overrides = {}) {
  return {
    personId,
    name,
    gender:       'M',
    x:            0,
    y:            0,
    z:            0,
    matchStatus:  'linked',
    coupleId:     `couple-${personId}`,
    coupleRole:   'single',
    coupleBlockX: 0,
    animOrder:    0,
    opacity:      1,
    ...overrides,
  };
}

export function makeCoupleNodes(husbandId = 'KR-HUS', wifeid = 'KR-WIFE', husbandName = '이관장', wifeName = '박관장처') {
  const coupleId = `couple-${husbandId}`;
  return [
    { personId: husbandId, name: husbandName, gender: 'M', x: 0,   y: 0, z: 0, matchStatus: 'linked', coupleId, coupleRole: 'left',  coupleBlockX: 0, animOrder: 0, opacity: 1 },
    { personId: wifeid,    name: wifeName,    gender: 'F', x: 220, y: 0, z: 0, matchStatus: 'linked', coupleId, coupleRole: 'right', coupleBlockX: 0, animOrder: 0, opacity: 1 },
  ];
}
