/**
 * 07-access-control.spec.js — §16 접근 권한 UI 요소 확인
 *
 * 검증 범위: 미입장자 화면 / AccessDeniedModal
 * 동작 테스트 아님 — 요소 존재 여부만 확인.
 */

import { test, expect } from '@playwright/test';
import { mockAuthAsVisitor } from './helpers/auth.js';

const SUBDOMAIN  = 'access-ui-test';
const SITE_ID    = 1;
const OWNER_ID   = 'KR-OWNER';

// ── 박물관 기본 모킹 (접근 차단) ──────────────────────────────────────────────
async function setupBlockedMocks(page) {
  await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN,
        display_name: '접근테스트 가족유산박물관', owner_person_id: OWNER_ID,
      }),
    });
  });
  await page.route('**/api/access/**', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, allowed: false }),
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§16 미입장자 화면', () => {

  test('3-1-1 문패 텍스트 — 박물관 이름 렌더링', async ({ page }) => {
    await mockAuthAsVisitor(page, 'KR-BLOCKED');
    await setupBlockedMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('text=접근테스트 가족유산박물관').first()).toBeVisible({ timeout: 8000 });
  });

  test('3-1-2 입장권 필요 안내 문구 렌더링', async ({ page }) => {
    await mockAuthAsVisitor(page, 'KR-BLOCKED');
    await setupBlockedMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 접근 불가 안내 — 트리 숨김, 안내 문구 노출
    await expect(page.locator('text=입장권이 필요합니다').first()).toBeVisible({ timeout: 8000 });
  });

  test('3-1-3 [입장권 요청하기] 버튼 렌더링', async ({ page }) => {
    await mockAuthAsVisitor(page, 'KR-BLOCKED');
    await setupBlockedMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("입장권 요청하기")').first()).toBeVisible({ timeout: 8000 });
  });

  test('3-1-4 트리 캔버스 미노출 (접근 차단 시)', async ({ page }) => {
    await mockAuthAsVisitor(page, 'KR-BLOCKED');
    await setupBlockedMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 트리가 없어야 함 (가족트리 캔버스 미노출)
    await expect(page.locator('canvas, [data-testid="family-tree"]')).not.toBeVisible({ timeout: 5000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§16 AccessDeniedModal', () => {

  test('3-2-1 권한 없는 URL 접근 시 AccessDeniedModal 렌더링', async ({ page }) => {
    await mockAuthAsVisitor(page, 'KR-BLOCKED');
    await setupBlockedMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 접근 불가 시 모달이 표시되어야 함 (단, 현재 구현은 gateCard UI로 대체될 수 있음)
    // AccessDeniedModal 또는 gateCard 중 하나가 표시됨
    const denied = page.locator('[role="dialog"][aria-label*="접근"], [data-testid="access-denied-modal"]').first();
    await expect(denied).toBeVisible({ timeout: 8000 });
  });

  test('3-2-2 외부인 카드 클릭 → AccessDeniedModal 또는 WormholeModal 표시', async ({ page }) => {
    // 이미 접근 허용된 상태에서 외부인 카드 클릭
    const { mockAuthAsCurator, makeSingleNode } = await import('./helpers/auth.js');
    const CURATOR = 'KR-CURATOR2';
    const OUTER   = 'KR-OUTER';
    const SUB2    = 'access-denied-test';

    await mockAuthAsCurator(page, SUB2, CURATOR);
    await page.route(`**/api/museum/${SUB2}`, async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: 2, site_id: 2, subdomain: SUB2, owner_person_id: CURATOR }),
      });
    });
    await page.route('**/api/access/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, allowed: true }) });
    });
    await page.route(`**/api/tree/${SUB2}`, async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          nodes: [
            makeSingleNode(CURATOR, '이관장2'),
            makeSingleNode(OUTER, '외부인', { matchStatus: 'linked', x: 300 }),
          ],
          connectors: [], meta: {}, curatorId: CURATOR,
        }),
      });
    });
    await page.route('**/api/exhibitions**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.goto(`/${SUB2}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.locator('text=외부인').first().click();

    // WormholeModal 또는 AccessDeniedModal 중 하나가 표시됨
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

});
