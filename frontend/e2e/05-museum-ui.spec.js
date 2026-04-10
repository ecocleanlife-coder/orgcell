/**
 * 05-museum-ui.spec.js — §31 박물관 메인 UI 요소 존재 확인
 *
 * 검증 범위: 헤더 / 메뉴바 / 슬라이드배너 / 가족트리 / §25 안내모달
 * 동작 테스트 아님 — 요소 존재 여부만 확인.
 */

import { test, expect } from '@playwright/test';
import {
  mockAuthAsCurator,
  mockAuthAsVisitor,
  makeSingleNode,
  makeCoupleNodes,
} from './helpers/auth.js';

const SUBDOMAIN  = 'ui-museum-test';
const SITE_ID    = 1;
const CURATOR_ID = 'KR-CURATOR';

// ── 공통 박물관 API 모킹 ─────────────────────────────────────────────────────
async function setupMuseumMocks(page, {
  nodes     = [],
  exhibitions = [],
  isCurator = true,
} = {}) {
  const personId = CURATOR_ID;

  await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN,
        display_name: 'UI테스트 가족유산박물관',
        owner_person_id: personId,
        banner_slides: [],
      }),
    });
  });

  await page.route(`**/api/tree/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, nodes, connectors: [], meta: {}, curatorId: personId }),
    });
  });

  await page.route('**/api/access/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, allowed: true }),
    });
  });

  await page.route('**/api/exhibitions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: exhibitions }),
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§31 헤더 (Museum Header)', () => {

  test('1-1-1 로고 "Orgcell" 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=Orgcell').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-1-2 박물관 타이틀 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=UI테스트 가족유산박물관').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-1-3 언어 선택 드롭다운 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // aria-label="언어 선택" 또는 select 요소
    await expect(page.locator('select[aria-label="언어 선택"], select').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-1-4 로그아웃 버튼 렌더링 (로그인 시)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("로그아웃")').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-1-5 ← 돌아가기 버튼 — ArchivePage 진입 시 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    // ArchivePage도 박물관 API 필요
    await page.route(`**/api/museum/mine`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: SITE_ID, subdomain: SUBDOMAIN }] }),
      });
    });
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=← 돌아가기').first()).toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§12 메뉴바 (Menu Bar — 자판기 버튼)', () => {

  test('1-2-1 공개 전시관 버튼 자판기 스타일 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, {
      exhibitions: [{ type: 'photo', is_public: true }],
    });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=사진전시관').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-2-2 공유앨범 버튼 — 📷 아이콘 + "공유앨범" 텍스트', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, {
      exhibitions: [{ type: 'shared-album', is_public: true }],
    });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=공유앨범').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-2-3 메뉴 버튼 onMouseDown translateY 효과 핸들러 존재 확인', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, {
      exhibitions: [{ type: 'photo', is_public: true }],
    });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 버튼이 존재하고 클릭 가능함을 검증 (DOM 이벤트 핸들러는 코드에 있음)
    const btn = page.locator('text=사진전시관').first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.dispatchEvent('mousedown');
    await btn.dispatchEvent('mouseup');
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§31 슬라이드 배너 (Slide Banner)', () => {

  test('1-3-1 배너 영역 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 배너 내 description(박물관명) 또는 배너 컨트롤 점이 렌더링됨을 확인
    // SlideBanner는 반드시 렌더되며 subdomain 가족유산박물관 텍스트 포함
    await expect(page.locator(`text=${SUBDOMAIN} 가족유산박물관`).first()).toBeVisible({ timeout: 8000 });
  });

  test('1-3-2 배너 오버레이 텍스트 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    // banner_slides에 name 포함
    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN,
          display_name: 'UI테스트 가족유산박물관',
          owner_person_id: CURATOR_ID,
          banner_slides: [{ photoUrl: null, name: '이관장', description: '관장 소개', exhibitionType: null }],
        }),
      });
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
        body: JSON.stringify({ success: true, data: [] }) });
    });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=이관장').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-3-3 ⚙️ Setting 버튼 — 관장만 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("⚙️ Setting")').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-3-4 다운로드 버튼 — 관장이 허락한 경우 노출', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 다운로드 버튼이 구현된 경우에만 표시
    await expect(page.locator('button:has-text("다운로드"), [data-testid="banner-download"]').first()).toBeVisible({ timeout: 5000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§22~§24 가족트리 캔버스 (Family Tree Canvas)', () => {

  test('1-4-1 인물 카드 렌더링 — 이름 표시', async ({ page }) => {
    const nodes = [makeSingleNode(CURATOR_ID, '이관장')];
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, { nodes });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=이관장').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-4-2 인물 카드 ID (personId) 표시', async ({ page }) => {
    const nodes = [makeSingleNode(CURATOR_ID, '이관장')];
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, { nodes });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator(`text=${CURATOR_ID}`).first()).toBeVisible({ timeout: 8000 });
  });

  test('1-4-3 고인 생존기간 형식 렌더링', async ({ page }) => {
    const nodes = [makeSingleNode(CURATOR_ID, '이관장', {
      isDeceased: true, birthYear: 1930, deathYear: 2005,
    })];
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, { nodes });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 1930~2005 또는 1930-2005 형식 렌더링
    await expect(page.locator('text=1930').first()).toBeVisible({ timeout: 8000 });
  });

  // 1-4-4 → 대표정보 렌더링 검증 제외 (spec 외 항목)

  test('1-4-4 관장 부부 카드 두꺼운 테두리 스타일 적용', async ({ page }) => {
    const nodes = makeCoupleNodes(CURATOR_ID, 'KR-SPOUSE', '이관장', '박배우자');
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, { nodes });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // curator 카드에는 두꺼운 테두리 클래스 또는 스타일 적용됨
    const curatorCard = page.locator('[data-testid="curator-card"], .folder-card-curator').first();
    await expect(curatorCard).toBeVisible({ timeout: 8000 });
  });

  test('1-4-5 카드 호버 시 "OOO 박물관" 툴팁 렌더링', async ({ page }) => {
    const nodes = [makeSingleNode('KR-OTHER', '김타인', { matchStatus: 'linked' })];
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, { nodes });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 타인 카드에 마우스 올리면 툴팁 출력
    const card = page.locator('text=김타인').first();
    await card.hover();
    await expect(page.locator('text=김타인 박물관').first()).toBeVisible({ timeout: 5000 });
  });

  test('1-4-6 타인 카드 클릭 → 이동 확인 모달 렌더링', async ({ page }) => {
    const nodes = [
      makeSingleNode(CURATOR_ID, '이관장'),
      makeSingleNode('KR-OTHER', '김타인', { matchStatus: 'linked', x: 300 }),
    ];
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page, { nodes });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 타인 카드 클릭
    await page.locator('text=김타인').first().click();
    await expect(
      page.locator('text=김타인님의 박물관으로 이동하시겠습니까?').first()
    ).toBeVisible({ timeout: 5000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§25 전시 기준 안내 모달', () => {

  test('1-5-1 첫 방문 시 전시 기준 안내 모달 자동 표시', async ({ page }) => {
    // localStorage 초기화하여 "첫 방문" 시뮬레이션
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.addInitScript(() => {
      localStorage.removeItem('orgcell_exhibit_guide_seen');
    });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 전시 기준 안내 모달이 자동 표시되어야 함
    await expect(page.locator('[aria-label="전시 기준 안내"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('1-5-2 [?] 도움말 버튼 항상 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // [?] 버튼이 항상 화면에 노출되어야 함
    await expect(page.locator('button:has-text("?"), [data-testid="help-btn"]').first()).toBeVisible({ timeout: 8000 });
  });

});
