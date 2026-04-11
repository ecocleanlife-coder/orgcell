/**
 * 06-archive-ui.spec.js — §8 자료실 UI 요소 존재 확인
 *
 * 검증 범위: 좌측 폼 / 우측 버튼 / 관계탭 §9 / §26-3 신고 버튼
 * 동작 테스트 아님 — 요소 존재 여부만 확인.
 */

import { test, expect } from '@playwright/test';
import { mockAuthAsCurator, makeSingleNode } from './helpers/auth.js';

const SUBDOMAIN  = 'archive-ui-test';
const SITE_ID    = 1;
const CURATOR_ID = 'KR-CURATOR';

async function setupArchiveMocks(page, curatorNode = null) {
  await page.route('**/api/museum/mine', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [{ id: SITE_ID, subdomain: SUBDOMAIN }] }),
    });
  });
  await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN,
        display_name: '자료실테스트 박물관', owner_person_id: CURATOR_ID }),
    });
  });

  const nodes = curatorNode ? [curatorNode] : [];
  await page.route(`**/api/tree/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, nodes, connectors: [], meta: {}, curatorId: CURATOR_ID }),
    });
  });

  await page.route('**/api/access/**', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, allowed: true }),
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§8 자료실 좌측 영역', () => {

  test('2-1-1 사진 업로드 드롭존 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 드롭존: 클릭/끌어서 놓기 영역
    await expect(page.locator('text=클릭 또는 사진을 끌어다 놓으세요').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-1-2 이름 입력 필드 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('input[placeholder*="성함"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-1-3 생년월일 입력 필드 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 년/월/일 분리 입력 방식 (OnboardingPage 방식)
    await expect(page.locator('input[placeholder*="년"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-1-4 성별 라디오 버튼 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=남').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=여').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-1-5 사망 여부 체크박스 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=사망').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-1-6 대표정보 1/2/3 제거됨 (§8)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // §8에서 대표정보 1/2/3 제거됨 — 렌더링 되지 않아야 함
    await expect(page.locator('text=대표정보 1').first()).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=대표정보 2').first()).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=대표정보 3').first()).not.toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§8 자료실 우측 버튼 영역', () => {

  test('2-2-1 전시관 버튼 6종 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("사진자료실")').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("주요자료실")').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("주요약력")').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("자서전")').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("작품실")').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("육성녹음")').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-2-2 공유앨범 버튼 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("공유앨범")').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-2-3 분리선(divider) 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 우측 aside 내 구분선 (hr 또는 divider 요소)
    await expect(page.locator('aside [style*="height: 1px"], aside hr, aside .divider').first()).toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§8 자료실 우측 하단 관리 버튼', () => {

  test('2-3-1 초대하기 버튼 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("초대하기")').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-3-2 입장권 발급 버튼 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("입장권 발급")').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-3-3 접근요청관리 버튼 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("접근요청관리")').first()).toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§9 관계 탭 — [생성][수정][제거] 버튼 상태', () => {

  test('2-4-1 미등록 인물 → [생성] 활성, [수정][제거] 비활성', async ({ page }) => {
    // curatorNode 없음 → 미등록 상태
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page, null);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createBtn = page.locator('button:has-text("생성")').first();
    const updateBtn = page.locator('button:has-text("수정")').first();
    const deleteBtn = page.locator('button:has-text("제거")').first();

    await expect(createBtn).toBeVisible({ timeout: 8000 });
    await expect(updateBtn).toBeVisible({ timeout: 8000 });
    await expect(deleteBtn).toBeVisible({ timeout: 8000 });

    // [생성]은 enabled, [수정][제거]는 disabled
    await expect(createBtn).not.toBeDisabled({ timeout: 5000 });
    await expect(updateBtn).toBeDisabled({ timeout: 5000 });
    await expect(deleteBtn).toBeDisabled({ timeout: 5000 });
  });

  test('2-4-2 등록된 인물 → [수정][제거] 활성, [생성] 비활성', async ({ page }) => {
    const node = makeSingleNode(CURATOR_ID, '이관장');
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page, node);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const createBtn = page.locator('button:has-text("생성")').first();
    const updateBtn = page.locator('button:has-text("수정")').first();
    const deleteBtn = page.locator('button:has-text("제거")').first();

    await expect(createBtn).toBeVisible({ timeout: 8000 });
    await expect(updateBtn).toBeVisible({ timeout: 8000 });
    await expect(deleteBtn).toBeVisible({ timeout: 8000 });

    // [생성]은 disabled, [수정][제거]는 enabled
    await expect(createBtn).toBeDisabled({ timeout: 5000 });
    await expect(updateBtn).not.toBeDisabled({ timeout: 5000 });
    await expect(deleteBtn).not.toBeDisabled({ timeout: 5000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§8 사진 위치/크기 조정 에디터', () => {

  test('2-6-1 사진 업로드 후 드래그 위치 조정 UI 렌더링', async ({ page }) => {
    const node = makeSingleNode(CURATOR_ID, '이관장', { photoUrl: 'https://placehold.co/200x200' });
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page, node);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('[data-testid="photo-drag-area"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('2-6-2 크기 조절 핸들 렌더링', async ({ page }) => {
    const node = makeSingleNode(CURATOR_ID, '이관장', { photoUrl: 'https://placehold.co/200x200' });
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page, node);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('[data-testid="photo-resize-handle"]').first()).toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§26-3 잘못된 통합 신고 버튼', () => {

  test('2-5-1 통합 알림 시 [잘못된 통합 신고] 버튼 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupArchiveMocks(page);
    // 통합 알림 API 모킹 (통합 알림 있음 시뮬레이션)
    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 1, mergedPersonId: 'KR-OTHER', mergedAt: '2024-01-01' }] }),
      });
    });
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(
      page.locator('button:has-text("잘못된 통합 신고")').first()
    ).toBeVisible({ timeout: 8000 });
  });

});
