/**
 * verify_api_routes.js
 * 프론트엔드 API 호출 경로 ↔ 백엔드 라우트 교차검증
 *
 * 실행: node scripts/verify_api_routes.js
 *
 * 출력:
 *   ✅ MATCHED   — 프론트 호출 & 백엔드 라우트 모두 존재
 *   ❌ MISSING   — 프론트가 호출하지만 백엔드 라우트 없음
 *   ℹ️  BACKEND_ONLY — 백엔드에만 있는 라우트 (참고용)
 */

const fs   = require('fs');
const path = require('path');

// ── 경로 설정 ─────────────────────────────────────────────────────────────────
const FRONTEND_SRC   = path.join(__dirname, '..', 'frontend', 'src');
const BACKEND_ROUTES = path.join(__dirname, '..', 'backend', 'src', 'routes');
const BACKEND_SERVER = path.join(__dirname, '..', 'backend', 'server.js');

// ══════════════════════════════════════════════════════════════════════════════
// 1. 백엔드 마운트 프리픽스 추출 (server.js ROUTE_MAP)
// ══════════════════════════════════════════════════════════════════════════════
function extractMountMap() {
  const src = fs.readFileSync(BACKEND_SERVER, 'utf8');
  const map = {};
  // 'fooRoutes': '/api/foo'  또는 "fooRoutes": "/api/foo"
  const re = /['"](\w+Routes)['"]:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. 백엔드 라우트 파일에서 등록된 하위경로 추출
//    router.get('/foo/:id', ...)  →  /foo/:id
// ══════════════════════════════════════════════════════════════════════════════
function extractBackendRoutes(mountMap) {
  const routes = new Set();

  for (const [file, prefix] of Object.entries(mountMap)) {
    const filePath = path.join(BACKEND_ROUTES, `${file}.js`);
    if (!fs.existsSync(filePath)) continue;

    const src = fs.readFileSync(filePath, 'utf8');
    // router.get|post|put|patch|delete('...')
    const re = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const sub = m[2] === '/' ? '' : m[2];
      routes.add(`${prefix}${sub}`);
    }
    // router.use(protect) 나 router.use('/path', ...) 도 포함 (마운트 자체)
    routes.add(prefix);
  }

  return routes;
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. 프론트엔드 소스에서 API 호출 URL 추출
//    apiFetch('/api/foo')   fetch('/api/foo')   axios.post('/api/foo')
// ══════════════════════════════════════════════════════════════════════════════
function walkDir(dir, exts = ['.js', '.jsx', '.ts', '.tsx']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full, exts));
    else if (exts.some(e => entry.name.endsWith(e))) results.push(full);
  }
  return results;
}

function extractFrontendCalls(srcDir) {
  const calls = new Map(); // url → Set<file>
  const files = walkDir(srcDir);

  // 단순 문자열 템플릿 처리: `/api/foo/${id}/bar` → /api/foo/:param/bar
  const normalise = (url) =>
    url
      .replace(/\$\{[^}]+\}/g, ':param')   // ${...} → :param
      .replace(/\/+$/, '')                  // trailing slash 제거
      .split('?')[0];                       // 쿼리스트링 제거

  // Pass 1: fetch/apiFetch/axios.* 호출 내 문자열 리터럴 전부 수집
  // - 작은따옴표, 큰따옴표, 백틱 모두 지원
  // - /api/ 로 시작하는 경로만 필터
  const callRe = /(?:apiFetch|fetch|axios\.(?:get|post|put|patch|delete))\s*\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = callRe.exec(src)) !== null) {
      const raw = m[1] ?? m[2] ?? m[3] ?? '';
      // /api/ 를 포함하는지 확인
      const idx = raw.indexOf('/api/');
      if (idx === -1) continue;
      const url = normalise(raw.slice(idx));
      if (!url.startsWith('/api/')) continue;
      if (!calls.has(url)) calls.set(url, new Set());
      calls.get(url).add(path.relative(path.join(__dirname, '..'), file));
    }
  }
  return calls;
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. 교차 검증 — 백엔드 라우트와 비교
//    :id, :siteId, :token 등 파라미터는 패턴 매칭으로 비교
// ══════════════════════════════════════════════════════════════════════════════
function routeMatches(frontUrl, backendRoutes) {
  // 완전 일치
  if (backendRoutes.has(frontUrl)) return true;

  // 파라미터 패턴 비교: /api/foo/123  vs  /api/foo/:id
  for (const br of backendRoutes) {
    const fp = frontUrl.split('/');
    const bp = br.split('/');
    if (fp.length !== bp.length) continue;
    const ok = fp.every((seg, i) => bp[i] === seg || bp[i]?.startsWith(':') || seg.startsWith(':'));
    if (ok) return true;
  }

  // 프리픽스 매칭 (마운트 루트 자체)
  for (const br of backendRoutes) {
    if (frontUrl.startsWith(br + '/') || frontUrl === br) return true;
  }

  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// 메인
// ══════════════════════════════════════════════════════════════════════════════
function main() {
  console.log('\n🔍 API 라우트 교차검증 시작...\n');

  const mountMap      = extractMountMap();
  const backendRoutes = extractBackendRoutes(mountMap);
  const frontendCalls = extractFrontendCalls(FRONTEND_SRC);

  const matched  = [];
  const missing  = [];

  for (const [url, files] of frontendCalls.entries()) {
    if (routeMatches(url, backendRoutes)) {
      matched.push({ url, files: [...files] });
    } else {
      missing.push({ url, files: [...files] });
    }
  }

  // 백엔드 전용 (참고)
  const frontUrls = [...frontendCalls.keys()];
  const backendOnly = [...backendRoutes].filter(
    br => br !== '' && !frontUrls.some(fu => routeMatches(fu, new Set([br])))
  ).sort();

  // ── 출력 ───────────────────────────────────────────────────────────────────
  console.log('─'.repeat(70));
  console.log(`✅ MATCHED  (${matched.length})`);
  console.log('─'.repeat(70));
  for (const { url } of matched.sort((a,b) => a.url.localeCompare(b.url))) {
    console.log(`  ${url}`);
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`❌ MISSING — 프론트 호출 but 백엔드 라우트 없음 (${missing.length})`);
  console.log('─'.repeat(70));
  if (missing.length === 0) {
    console.log('  없음 — 모든 경로 정상');
  } else {
    for (const { url, files } of missing.sort((a,b) => a.url.localeCompare(b.url))) {
      console.log(`  ❌ ${url}`);
      for (const f of files) console.log(`       └─ ${f}`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`ℹ️  BACKEND_ONLY — 백엔드에만 존재 (미사용 or 미래용) (${backendOnly.length})`);
  console.log('─'.repeat(70));
  for (const r of backendOnly.slice(0, 30)) console.log(`  ${r}`);
  if (backendOnly.length > 30) console.log(`  ... +${backendOnly.length - 30}개 더`);

  console.log('\n' + '═'.repeat(70));
  console.log(`결과: MATCHED ${matched.length} / MISSING ${missing.length} / BACKEND_ONLY ${backendOnly.length}`);
  console.log('═'.repeat(70) + '\n');

  // 종료 코드: MISSING 있으면 1
  process.exit(missing.length > 0 ? 1 : 0);
}

main();
