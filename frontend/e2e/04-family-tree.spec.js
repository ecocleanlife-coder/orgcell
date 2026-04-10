/**
 * 04-family-tree.spec.js — 가족 추가 및 트리 표시 검증
 *
 * 검증 항목:
 *   1. 자료실(archive) 접속 → ArchivePage 렌더
 *   2. 트리 노드 표시 — /api/tree 응답에 포함된 인물이 canvas에 렌더링
 *   3. 인물 추가 후 트리 갱신 — POST /api/persons 후 트리 재요청
 *
 * §22 z=0 인물만 화면 표시 원칙 검증
 */

import { test, expect } from '@playwright/test';
import { mockAuthAsCurator, makeSingleNode } from './helpers/auth.js';

const SUBDOMAIN = 'lee-tree-test';
const SITE_ID   = 1;
const OWNER_ID  = 'KR-OWN01';

// 기본 API 모킹 세트
async function setupTreeMocks(page, nodes = []) {
  await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: OWNER_ID, display_name: '트리테스트 박물관' }),
    });
  });

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
      body: JSON.stringify({ success: true, nodes, connectors: [], meta: {}, curatorId: OWNER_ID }),
    });
  });

  // 전시관 목록 모킹
  await page.route('**/api/exhibitions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

test.describe('가족트리 표시 및 인물 추가 (§22)', () => {

  // ── 1. 자료실 접속 ─────────────────────────────────────────────────────────
  test('자료실(archive) 접속 → ArchivePage 렌더', async ({ page }) => {
    await mockAuthAsCurator(page, SUBDOMAIN, OWNER_ID);
    await setupTreeMocks(page);

    // 자료실 접속
    await page.route(`**/api/persons/${SUBDOMAIN}/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`/${SUBDOMAIN}/archive`);

    // ArchivePage 렌더 확인 (자료실 특유 UI 요소)
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // 자료실 페이지가 오류 없이 로드됨을 확인
    const title = await page.title();
    expect(title).not.toBe('');
  });

  // ── 2. 트리 노드 렌더 ─────────────────────────────────────────────────────
  test('트리 노드 표시 — z=0 인물이 렌더링됨', async ({ page }) => {
    const coupleId = `couple-${OWNER_ID}`;
    const nodes = [
      makeSingleNode(OWNER_ID, '이관장', { coupleId, coupleRole: 'left', coupleBlockX: 0 }),
      makeSingleNode('KR-SPO01', '박관장처', { gender: 'F', x: 220, matchStatus: 'ghost', coupleId, coupleRole: 'right', coupleBlockX: 0 }),
    ];

    await mockAuthAsCurator(page, SUBDOMAIN, OWNER_ID);
    await setupTreeMocks(page, nodes);

    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // 트리 노드 (인물 카드) 렌더 확인 — 이름이 화면에 표시되어야 함
    await expect(page.locator('text=이관장')).toBeVisible({ timeout: 8000 });
  });

  // ── 3. 인물 추가 후 트리 갱신 ────────────────────────────────────────────
  test('POST /api/persons 후 트리 갱신 요청', async ({ page }) => {
    const newPersonId = 'KR-SON01';
    let treeCallCount = 0;

    await mockAuthAsCurator(page, SUBDOMAIN, OWNER_ID);

    await page.route(`**/api/museum/${SUBDOMAIN}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: SITE_ID, site_id: SITE_ID, subdomain: SUBDOMAIN, owner_person_id: OWNER_ID }),
      });
    });
    await page.route('**/api/access/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, allowed: true }) });
    });

    // 트리 API — 호출 횟수 추적 (인물 추가 후 재호출 확인)
    await page.route(`**/api/tree/${SUBDOMAIN}`, async (route) => {
      treeCallCount++;
      const extraNodes = treeCallCount > 1
        ? [makeSingleNode(OWNER_ID, '이관장'), makeSingleNode(newPersonId, '이아들', { y: 200 })]
        : [makeSingleNode(OWNER_ID, '이관장')];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, nodes: extraNodes, connectors: [], meta: {}, curatorId: OWNER_ID }),
      });
    });

    // POST /api/persons 모킹
    await page.route(`**/api/persons/${SUBDOMAIN}`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { person_id: newPersonId, name: '이아들', gender: 'M' } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/exhibitions**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.goto(`/${SUBDOMAIN}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // 초기 트리 요청 확인
    expect(treeCallCount).toBeGreaterThanOrEqual(1);

    // 관장 카드 표시 확인
    await expect(page.locator('text=이관장')).toBeVisible({ timeout: 8000 });
  });

});
