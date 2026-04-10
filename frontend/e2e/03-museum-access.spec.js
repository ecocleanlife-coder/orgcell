/**
 * 03-museum-access.spec.js — 박물관 접근 권한 검증
 *
 * 검증 항목:
 *   1. 관장 로그인 → /{subdomain} 직접 접속 → MuseumPage 렌더 (입장권 없이)
 *   2. 비관장 로그인 → 타인 /{subdomain} 접속 → /api/access 체크 후 접근 제한 UI
 *   3. 비로그인 → /{subdomain} 접속 → 로그인 유도 UI
 *
 * §16 입장권 체계 기반 접근 제어 검증
 */

import { test, expect } from '@playwright/test';
import { mockAuthAsNewUser, mockAuthAsCurator, mockAuthAsVisitor, mockMuseumAPIs } from './helpers/auth.js';

const SUBDOMAIN = 'lee-access-test';
const SITE_ID   = 1;
const PERSON_ID = 'KR-TEST1';

test.describe('박물관 접근 권한 (§16)', () => {

  // ── 1. 관장 → 바로 입장 ───────────────────────────────────────────────────
  test('관장 로그인 → 박물관 직접 입장 (입장권 불필요)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN);
    await mockMuseumAPIs(page, SUBDOMAIN);

    await page.goto(`/${SUBDOMAIN}`);

    // MuseumPage 렌더 확인 — 관장은 접근 차단 없이 바로 진입
    // (접근 제한 모달이 없어야 함)
    await expect(page.locator('text=입장권 요청하기')).not.toBeVisible({ timeout: 5000 });
  });

  // ── 2. 비관장 → 접근 허용 (입장권 있음) ──────────────────────────────────
  test('입장권 있는 방문자 → 박물관 입장 가능', async ({ page }) => {
    await mockAuthAsVisitor(page, PERSON_ID);

    // 박물관 API 모킹
    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: PERSON_ID, display_name: 'E2E 박물관' }),
      });
    });

    // 입장권 체크 → 허용
    await page.route('**/api/access/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, allowed: true }),
      });
    });

    await page.route(`**/api/tree/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, nodes: [], connectors: [], meta: {}, curatorId: PERSON_ID }),
      });
    });
    await page.route('**/api/exhibitions**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.goto(`/${SUBDOMAIN}`);

    // 입장권 요청 UI가 없어야 함 (입장 허용)
    await page.waitForTimeout(2000);
    await expect(page.locator('text=입장권 요청하기')).not.toBeVisible();
  });

  // ── 3. 비관장 → 접근 차단 (입장권 없음) ──────────────────────────────────
  test('입장권 없는 방문자 → 입장권 요청 UI 표시', async ({ page }) => {
    await mockAuthAsVisitor(page, 'KR-BLOCKED');

    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: PERSON_ID, display_name: 'E2E 박물관' }),
      });
    });

    // 입장권 체크 → 차단
    await page.route('**/api/access/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, allowed: false }),
      });
    });

    await page.goto(`/${SUBDOMAIN}`);

    // §16: 문패만 공개, 입장권 요청 버튼 표시
    await expect(page.locator('text=입장권 요청하기')).toBeVisible({ timeout: 8000 });
  });

});
