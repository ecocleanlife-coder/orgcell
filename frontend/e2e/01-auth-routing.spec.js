/**
 * 01-auth-routing.spec.js — 로그인 후 라우팅 검증
 *
 * 검증 항목:
 *   1. 비로그인 → '/' → LandingPage 표시 (리다이렉트 없음)
 *   2. 신규 유저 로그인 (박물관 없음) → '/' → /onboarding 이동
 *   3. 기존 유저 로그인 (박물관 있음) → '/' → /{subdomain} 이동
 */

import { test, expect } from '@playwright/test';
import { mockAuthAsNewUser, mockAuthAsCurator } from './helpers/auth.js';

test.describe('로그인 후 라우팅', () => {

  test('비로그인 → LandingPage 렌더 (리다이렉트 없음)', async ({ page }) => {
    // auth/me → 401 (미인증)
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Unauthorized' }) });
    });

    await page.goto('/');

    await expect(page.locator('text=가족유산박물관')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL('/');
  });

  test('신규 유저 로그인 → /onboarding redirect', async ({ page }) => {
    await mockAuthAsNewUser(page);

    await page.goto('/');
    await expect(page).toHaveURL('/onboarding', { timeout: 8000 });

    await expect(page.locator('text=박물관 개설')).toBeVisible();
    await expect(page.locator('text=1단계')).toBeVisible();
  });

  test('기존 유저 로그인 (박물관 있음) → /{subdomain} redirect', async ({ page }) => {
    const subdomain = 'test-routing-museum';

    await mockAuthAsCurator(page, subdomain);

    // MuseumPage 렌더에 필요한 API 최소 모킹
    await page.route(`**/api/museum/${subdomain}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, site_id: 1, subdomain, display_name: '테스트 박물관', owner_person_id: 'KR-CURATOR' }),
      });
    });
    await page.route(`**/api/tree/${subdomain}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, nodes: [], connectors: [], meta: {}, curatorId: 'KR-CURATOR' }),
      });
    });
    await page.route('**/api/access/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, allowed: true }) });
    });
    await page.route('**/api/exhibitions**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.goto('/');
    await expect(page).toHaveURL(`/${subdomain}`, { timeout: 8000 });
  });

});
