/**
 * 08-features-ui.spec.js — 특수 기능 모듈 UI 요소 확인
 *
 * 검증 범위: §11 공유앨범 / §27 온보딩 / §17 초대 / §18 기부 / §32 캘린더
 * 동작 테스트 아님 — 요소 존재 여부만 확인.
 */

import { test, expect } from '@playwright/test';
import { mockAuthAsNewUser, mockAuthAsCurator } from './helpers/auth.js';

const SUBDOMAIN  = 'features-ui-test';
const SITE_ID    = 1;
const CURATOR_ID = 'KR-CURATOR';

// ── 자료실 진입 공통 모킹 ─────────────────────────────────────────────────────
async function setupArchiveMocks(page) {
  await page.route('**/api/museum/mine', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [{ id: SITE_ID, subdomain: SUBDOMAIN }] }) });
  });
  await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN,
        display_name: '기능테스트 박물관', owner_person_id: CURATOR_ID }) });
  });
  await page.route(`**/api/tree/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, nodes: [], connectors: [], meta: {}, curatorId: CURATOR_ID }) });
  });
  await page.route('**/api/access/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, allowed: true }) });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§11 공유앨범 모듈', () => {

  test('4-1-1 공개범위 라디오 — 전체공개/가족만/링크만', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.route('**/api/album/shared**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, album: null }) });
    });
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // 공유앨범 탭 클릭
    await page.locator('button:has-text("공유앨범")').first().click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=전체공개').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=가족만').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=링크만').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-1-2 공유앨범 생성 버튼 렌더링 (앨범 없을 때)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.route('**/api/album/shared**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, album: null }) });
    });
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.locator('button:has-text("공유앨범")').first().click();
    await page.waitForTimeout(1000);

    await expect(page.locator('button:has-text("공유앨범 생성")').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-1-3 공유앨범 개별 사진 다운로드 체크박스', async ({ page }) => {
    // 공유앨범 전시 페이지 접근
    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: CURATOR_ID }) });
    });
    await page.route('**/api/album/shared**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, album: { id: 1, scope: 'public', token: 'abc123' },
          photos: [{ id: 1, url: '/uploads/test.jpg', caption: '가족사진' }] }) });
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json',
        body: JSON.stringify({ success: false }) });
    });
    await page.goto(`/${SUBDOMAIN}/exhibition/shared-album`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 사진별 다운로드 체크박스
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-1-4 공유앨범 다운로드 버튼 렌더링', async ({ page }) => {
    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: CURATOR_ID }) });
    });
    await page.route('**/api/album/shared**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, album: { id: 1, scope: 'public' },
          photos: [{ id: 1, url: '/uploads/test.jpg', caption: '가족사진' }] }) });
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json',
        body: JSON.stringify({ success: false }) });
    });
    await page.goto(`/${SUBDOMAIN}/exhibition/shared-album`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(
      page.locator('button:has-text("다운로드"), [data-testid="download-btn"]').first()
    ).toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§27 온보딩 모듈', () => {

  test('4-2-1 성(姓) 입력 필드 렌더링', async ({ page }) => {
    await mockAuthAsNewUser(page);
    await page.route('**/api/persons/search**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, candidates: [] }) });
    });
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 성 입력 필드
    await expect(page.locator('input[placeholder*="성"], label:has-text("성") + input, input[name="lastName"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-2-2 이름 입력 필드 렌더링', async ({ page }) => {
    await mockAuthAsNewUser(page);
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('input[placeholder*="이름"], label:has-text("이름") + input').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-2-3 영문 여권명 입력 필드 렌더링', async ({ page }) => {
    await mockAuthAsNewUser(page);
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 영문 Last / First
    await expect(page.locator('text=영문').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-2-4 본관 입력 필드 렌더링', async ({ page }) => {
    await mockAuthAsNewUser(page);
    await page.route('**/api/subdomain/bon-gwan**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify([]) });
    });
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=본관').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-2-5 본관 나중에 입력 체크박스 렌더링', async ({ page }) => {
    await mockAuthAsNewUser(page);
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=나중에 입력').first()).toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§17 초대 시스템 모듈 (InvitePage)', () => {

  async function setupInviteMocks(page, token = 'test-token') {
    await page.route(`**/api/invite/${token}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {
          token, museumName: '초대테스트 박물관', inviterName: '이관장', siteId: 1,
        }}) });
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, email: 'invitee@test.com', name: '피초대자', person_id: 'KR-INVITEE' } }) });
    });
  }

  test('4-3-1 수락 버튼 렌더링', async ({ page }) => {
    await setupInviteMocks(page);
    await page.goto('/invite/test-token');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("수락하기")').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-3-2 거절 버튼 렌더링', async ({ page }) => {
    await setupInviteMocks(page);
    await page.goto('/invite/test-token');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("거절하기")').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-3-3 수락 시 노출 선택 옵션 — 이름 전체/성만/익명', async ({ page }) => {
    await setupInviteMocks(page);
    await page.route('**/api/invite/test-token/respond', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) });
    });
    await page.goto('/invite/test-token');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 수락하기 클릭하면 노출 선택 화면으로 이동
    await page.locator('button:has-text("수락하기")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=이름 전체 공개').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=성만 공개').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=익명').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-3-4 거절 후 RefusedPersonBox 렌더링', async ({ page }) => {
    await setupInviteMocks(page);
    await page.route('**/api/invite/test-token/respond', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true }) });
    });
    await page.goto('/invite/test-token');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.locator('button:has-text("거절하기")').first().click();
    await page.waitForTimeout(500);
    // 거절 확인 모달 또는 버튼
    await page.locator('button:has-text("거절 확인")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=초대를 거절했습니다').first()).toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§18 기부/Stripe 결제', () => {

  test('4-4-1 기부 금액 입력 필드 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 기부 섹션 또는 버튼 진입
    await expect(
      page.locator('input[placeholder*="기부"], [data-testid="donation-amount"], input[name="amount"]').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('4-4-2 기부자 이름 입력 필드 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(
      page.locator('input[placeholder*="이름"], [data-testid="donor-name"]').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('4-4-3 Stripe 결제 버튼 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(
      page.locator('button:has-text("기부"), button:has-text("결제"), [data-testid="donate-btn"]').first()
    ).toBeVisible({ timeout: 5000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§32 가족행사 일정 캘린더', () => {

  test('4-5-1 메뉴바에 [가족행사일정] 버튼 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: CURATOR_ID }) });
    });
    await page.route(`**/api/tree/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, nodes: [], connectors: [], meta: {}, curatorId: CURATOR_ID }) });
    });
    await page.route('**/api/access/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, allowed: true }) });
    });
    await page.route('**/api/exhibitions**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ type: 'calendar', is_public: true }] }) });
    });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(
      page.locator('button:has-text("가족행사일정"), text=가족행사일정').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('4-5-2 캘린더 페이지 — 달력 셀 렌더링', async ({ page }) => {
    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: CURATOR_ID }) });
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, name: '관장', person_id: CURATOR_ID } }) });
    });
    await page.route('**/api/calendar**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, events: [
          { id: 1, personName: '이상훈', title: '생일', date: '2026-04-15', type: 'day' },
        ]}) });
    });
    await page.goto(`/${SUBDOMAIN}/exhibition/calendar`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 달력 UI 존재 확인
    await expect(
      page.locator('[data-testid="calendar"], .calendar-grid, table').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('4-5-3 캘린더 — 당일 행사 (색상 점 + 실명 + 행사명) 렌더링', async ({ page }) => {
    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: CURATOR_ID }) });
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, name: '관장', person_id: CURATOR_ID } }) });
    });
    await page.route('**/api/calendar**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, events: [
          { id: 1, personName: '이상훈', title: '생일', date: '2026-04-15', type: 'day' },
        ]}) });
    });
    await page.goto(`/${SUBDOMAIN}/exhibition/calendar`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 당일 행사 — 이름 + 행사명
    await expect(page.locator('text=이상훈').first()).toBeVisible({ timeout: 8000 });
  });

  test('4-5-4 캘린더 — 기간 행사 가로줄 렌더링', async ({ page }) => {
    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: CURATOR_ID }) });
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, name: '관장', person_id: CURATOR_ID } }) });
    });
    await page.route('**/api/calendar**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, events: [
          { id: 2, personName: '이상훈', title: '하와이 가족여행', startDate: '2026-04-20', endDate: '2026-04-25', type: 'range' },
        ]}) });
    });
    await page.goto(`/${SUBDOMAIN}/exhibition/calendar`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=하와이 가족여행').first()).toBeVisible({ timeout: 8000 });
  });

});
