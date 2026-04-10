/**
 * 09-common-ui.spec.js — §20/§21 공통 UI 요소 확인
 *
 * 검증 범위: Footer 저작권/이용약관 / 검색 모듈
 * 동작 테스트 아님 — 요소 존재 여부만 확인.
 */

import { test, expect } from '@playwright/test';
import { mockAuthAsCurator } from './helpers/auth.js';

const SUBDOMAIN  = 'common-ui-test';
const SITE_ID    = 1;
const CURATOR_ID = 'KR-CURATOR';

async function setupMuseumMocks(page) {
  await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN,
        display_name: '공통UI 박물관', owner_person_id: CURATOR_ID }),
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
}

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§20 푸터 (Footer)', () => {

  test('5-1-1 저작권 경고 문구 렌더링 (MuseumPage)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 저작권 경고 — 무단 복제/배포 금지
    await expect(
      page.locator('text=무단 복제').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('5-1-2 이용약관 버튼 렌더링 (MuseumPage)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("이용약관")').first()).toBeVisible({ timeout: 8000 });
  });

  test('5-1-3 저작권 경고 문구 렌더링 (ArchivePage)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await page.route('**/api/museum/mine', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: SITE_ID, subdomain: SUBDOMAIN }] }) });
    });
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(
      page.locator('text=무단 복제, text=복제').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('5-1-4 이용약관 버튼 렌더링 (ArchivePage)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await page.route('**/api/museum/mine', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: SITE_ID, subdomain: SUBDOMAIN }] }) });
    });
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}/archive`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await expect(page.locator('button:has-text("이용약관")').first()).toBeVisible({ timeout: 8000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
test.describe('§21 검색 모듈', () => {

  test('5-2-1 검색 입력란 렌더링 (이름/ID 검색바)', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 검색 입력란 — placeholder에 이름/ID 포함
    await expect(
      page.locator('input[placeholder*="검색"], input[placeholder*="이름"], input[placeholder*="ID"], [data-testid="search-input"]').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('5-2-2 검색 결과 패널 — 검색 후 결과 영역 렌더링', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, CURATOR_ID);
    await setupMuseumMocks(page);
    await page.route('**/api/persons/search**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, candidates: [
          { id: 1, name: '홍길동', person_id: 'KR-12345', birth_date: '1950-01-01' },
        ]}) });
    });
    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const searchInput = page.locator('input[placeholder*="검색"], input[placeholder*="이름"], [data-testid="search-input"]').first();
    await searchInput.fill('홍길동');
    await page.waitForTimeout(1000);

    // 검색 결과 패널 표시
    await expect(
      page.locator('text=홍길동, [data-testid="search-results"]').first()
    ).toBeVisible({ timeout: 5000 });
  });

});
