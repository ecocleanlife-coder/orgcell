/**
 * 02-onboarding.spec.js — 온보딩 전체 플로우 검증
 *
 * 검증 항목:
 *   1. /onboarding 접속 → 1단계 폼 렌더
 *   2. 필수 입력 없이 제출 → 오류 토스트 (validation)
 *   3. NO_MATCH 흐름: 검색 결과 없음 → CONFIRM_NEW → 새 박물관 개설
 *   4. CANDIDATES 흐름: 후보 있음 → 선택 → ADDITIONAL → 계정 연결
 *   5. 이전 버튼: CANDIDATES → INPUT 복귀
 *
 * API 모킹으로 실제 DB 없이 동작
 */

import { test, expect } from '@playwright/test';
import { mockAuthAsNewUser } from './helpers/auth.js';

const TEST_EMAIL_BASE = `onboarding-${Date.now()}`;

test.describe('온보딩 플로우', () => {

  test.beforeEach(async ({ page }) => {
    // 로그인 상태로 온보딩 진입
    await mockAuthAsNewUser(page);
  });

  // ── 1. 폼 렌더 확인 ────────────────────────────────────────────────────────
  test('1단계 폼 렌더 확인', async ({ page }) => {
    await page.goto('/onboarding');

    await expect(page.locator('text=박물관 개설')).toBeVisible();
    await expect(page.locator('text=1단계 — 본인 확인')).toBeVisible();
    await expect(page.locator('input[placeholder="예) 이"]')).toBeVisible();
    await expect(page.locator('input[placeholder="예) 상훈"]')).toBeVisible();
    await expect(page.locator('text=기존 박물관 찾기 →')).toBeVisible();
  });

  // ── 2. Validation ───────────────────────────────────────────────────────────
  test('필수 입력 없이 제출 → 오류 표시', async ({ page }) => {
    await page.goto('/onboarding');

    // 아무것도 입력하지 않고 검색 클릭
    await page.locator('text=기존 박물관 찾기 →').click();

    // react-hot-toast 오류 메시지 확인
    await expect(page.locator('text=성(姓)을 입력하세요')).toBeVisible({ timeout: 3000 });
  });

  // ── 3. NO_MATCH 흐름 ────────────────────────────────────────────────────────
  test('NO_MATCH → CONFIRM_NEW → 새 박물관 개설', async ({ page }) => {
    // /api/persons/search → 후보 없음
    await page.route('**/api/persons/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, candidates: [] }),
      });
    });

    // /api/sites → 박물관 생성 성공
    const newSubdomain = 'lee-e2e-test';
    await page.route('**/api/sites', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { subdomain: newSubdomain } }),
      });
    });

    // MuseumPage 최소 모킹
    await page.route(`**/api/museum/${newSubdomain}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, subdomain: newSubdomain, display_name: 'E2E 테스트 박물관' } }),
      });
    });
    await page.route(`**/api/tree/${newSubdomain}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, nodes: [], edges: [] }),
      });
    });

    await page.goto('/onboarding');

    // 1단계: 성/이름/성별 입력
    await page.locator('input[placeholder="예) 이"]').fill('이');
    await page.locator('input[placeholder="예) 상훈"]').fill('테스터');
    await page.locator('input[value="M"]').check();

    // 검색 실행
    await page.locator('text=기존 박물관 찾기 →').click();

    // 2단계: NO_MATCH → "후보 없음 — 새 박물관 개설" 화면
    await expect(page.locator('text=기존 박물관에서 일치하는 인물을 찾지 못했습니다')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=새 박물관 개설하기')).toBeVisible();

    // 3단계: 새 박물관 개설
    await page.locator('text=새 박물관 개설하기').click();

    // /{newSubdomain} 이동 확인
    await expect(page).toHaveURL(`/${newSubdomain}`, { timeout: 8000 });
  });

  // ── 4. CANDIDATES 흐름 ──────────────────────────────────────────────────────
  test('CANDIDATES → ADDITIONAL → 계정 연결', async ({ page }) => {
    const candidate = {
      person_id: 'KR-AAAAA',
      name: '이상훈',
      birth_date: '1985-03-15',
      gender: 'M',
      match_strength: 'strong',
      site_id: 1,
    };

    // /api/persons/search → 후보 1명 반환
    await page.route('**/api/persons/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, candidates: [candidate] }),
      });
    });

    // /api/persons/link-account → 연결 성공
    const linkedSubdomain = 'lee006-1';
    await page.route('**/api/persons/link-account', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, subdomain: linkedSubdomain }),
      });
    });

    // MuseumPage 최소 모킹
    await page.route(`**/api/museum/${linkedSubdomain}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, subdomain: linkedSubdomain, display_name: '이씨 박물관' } }),
      });
    });
    await page.route(`**/api/tree/${linkedSubdomain}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, nodes: [], edges: [] }),
      });
    });

    await page.goto('/onboarding');

    // 1단계 입력
    await page.locator('input[placeholder="예) 이"]').fill('이');
    await page.locator('input[placeholder="예) 상훈"]').fill('상훈');
    await page.locator('input[value="M"]').check();

    await page.locator('text=기존 박물관 찾기 →').click();

    // 2단계: 후보 목록
    await expect(page.locator('text=2단계 — 검색 결과')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=이상훈')).toBeVisible();
    await expect(page.locator('text=높은 일치')).toBeVisible();

    // 후보 선택
    await page.locator('text=이분입니다').click();

    // 추가 확인 단계
    await expect(page.locator('text=2단계 — 추가 확인')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=이상훈님과 동일인인지 확인하겠습니다')).toBeVisible();

    // 계정 연결
    await page.locator('text=이분이 맞습니다 — 계정 연결').click();

    // /{linkedSubdomain} 이동 확인
    await expect(page).toHaveURL(`/${linkedSubdomain}`, { timeout: 8000 });
  });

  // ── 5. 이전 버튼 ────────────────────────────────────────────────────────────
  test('CANDIDATES → ← 이전 → INPUT 복귀', async ({ page }) => {
    await page.route('**/api/persons/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, candidates: [{ person_id: 'KR-BBBBB', name: '김테스트', gender: 'F', match_strength: 'weak', site_id: 2 }] }),
      });
    });

    await page.goto('/onboarding');

    await page.locator('input[placeholder="예) 이"]').fill('김');
    await page.locator('input[placeholder="예) 상훈"]').fill('테스트');
    await page.locator('input[value="F"]').check();
    await page.locator('text=기존 박물관 찾기 →').click();

    await expect(page.locator('text=2단계 — 검색 결과')).toBeVisible({ timeout: 5000 });

    // 이전 버튼 클릭
    await page.locator('text=← 이전').click();

    // 1단계로 복귀 확인
    await expect(page.locator('text=1단계 — 본인 확인')).toBeVisible({ timeout: 3000 });
  });

});
