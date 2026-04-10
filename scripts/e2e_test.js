/**
 * e2e_test.js — 배포 전 핵심 플로우 자동 테스트
 *
 * 실행: node scripts/e2e_test.js
 *
 * 테스트 방식:
 *   - 공개 엔드포인트: HTTPS (https://orgcell.com/api/...)
 *   - 인증 필요 엔드포인트: EC2 SSH → JWT 토큰 직접 생성 → 내부 curl
 *
 * 전제 조건:
 *   - EC2 SSH 키: C:/Users/ldslh/.ssh/nci_ec2_temp
 *   - lee011-13 박물관 및 user_id=1 존재
 *
 * 종료 코드:
 *   0 = 전체 통과
 *   1 = 하나 이상 실패
 */

const https  = require('https');
const http   = require('http');
const { execSync } = require('child_process');

// ── 설정 ──────────────────────────────────────────────────────────────────────
const BASE_URL    = 'https://orgcell.com';
const SSH_KEY     = 'C:/Users/ldslh/.ssh/nci_ec2_temp';
const EC2_HOST    = 'ec2-user@3.132.118.205';
const TEST_SUB    = 'lee011-13';     // 기존 관장 박물관
const TEST_USER   = 1;              // user_id

// ── 유틸 ──────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label, detail = '') {
  console.log(`  ❌ ${label}${detail ? `\n       ${detail}` : ''}`);
  failed++;
  failures.push(label);
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

/** HTTPS GET — 응답 body + status 반환 */
function httpsGet(path, cookie = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'GET',
      headers:  { 'Accept': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

/** HTTPS POST */
function httpsPost(path, payload, cookie = '') {
  return new Promise((resolve, reject) => {
    const url  = new URL(BASE_URL + path);
    const data = JSON.stringify(payload);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Accept':         'application/json',
        'Origin':         BASE_URL,   // CSRF 통과용
        ...(cookie ? { Cookie: cookie } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

/**
 * EC2 내부에서 JWT 발급 + Node.js HTTP 요청 실행
 * - curl 없이 백엔드 컨테이너 안에서 node http 모듈 사용
 * - base64 인코딩으로 Windows/Linux 따옴표 이슈 완전 우회
 */
function ec2Curl(method, internalPath, payload = null) {
  const sshBase = `ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o LogLevel=quiet ${EC2_HOST}`;

  // 1. JWT 토큰 생성 (컨테이너 내부)
  let token;
  try {
    const jsCode = `const j=require('jsonwebtoken');process.stdout.write(j.sign({user:{id:${TEST_USER}}},process.env.JWT_SECRET,{expiresIn:'1h'}))`;
    const b64 = Buffer.from(jsCode).toString('base64');
    const jwtCmd = `${sshBase} "docker exec orgcell-backend node -e 'eval(Buffer.from(\`${b64}\`,\`base64\`).toString())' 2>/dev/null"`;
    token = execSync(jwtCmd, { timeout: 10000, shell: true }).toString().trim();
    if (!token || token.length < 20) throw new Error('토큰 짧음');
  } catch (e) {
    return { __error: 'JWT 생성 실패: ' + e.message.split('\n')[0] };
  }

  // 2. Node.js http 모듈로 컨테이너 내부 HTTP 요청 (curl 없음)
  try {
    const payloadStr = payload ? JSON.stringify(payload) : null;
    const reqScript = [
      `const http=require('http');`,
      `const opts={hostname:'localhost',port:5001,path:'${internalPath}',method:'${method}',`,
      `  headers:{'Authorization':'Bearer ${token}','Accept':'application/json'`,
      payloadStr ? `,'Content-Type':'application/json','Content-Length':Buffer.byteLength('${payloadStr.replace(/'/g, "\\'")}')` : '',
      `}};`,
      `const req=http.request(opts,(res)=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>process.stdout.write(b));});`,
      `req.on('error',e=>process.stdout.write(JSON.stringify({__httpError:e.message})));`,
      payloadStr ? `req.write('${payloadStr.replace(/'/g, "\\'")}');` : '',
      `req.end();`,
    ].join('');
    const b64req = Buffer.from(reqScript).toString('base64');
    const reqCmd = `${sshBase} "docker exec orgcell-backend node -e 'eval(Buffer.from(\`${b64req}\`,\`base64\`).toString())' 2>/dev/null"`;
    const out = execSync(reqCmd, { timeout: 15000, shell: true }).toString().trim();
    return JSON.parse(out);
  } catch (e) {
    return { __error: 'HTTP 요청 실패: ' + e.message.split('\n')[0] };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 테스트 스위트
// ══════════════════════════════════════════════════════════════════════════════

async function testHealth() {
  section('1. 헬스 체크');
  try {
    const r = await httpsGet('/api/health');
    if (r.status === 200) ok('GET /api/health → 200');
    else fail('GET /api/health', `status=${r.status}`);
  } catch (e) { fail('GET /api/health', e.message); }
}

async function testAuthPublic() {
  section('2. 인증 (비로그인)');
  try {
    const r = await httpsGet('/api/auth/me');
    if (r.status === 401) ok('GET /api/auth/me (비로그인) → 401');
    else fail('GET /api/auth/me (비로그인)', `status=${r.status} (401 기대)`);
  } catch (e) { fail('GET /api/auth/me', e.message); }
}

async function testMuseumPublic() {
  section('3. 박물관 공개 접근');
  try {
    const r = await httpsGet(`/api/museum/${TEST_SUB}`);
    if (r.status === 200) {
      const m = r.body?.data ?? r.body?.museum ?? r.body;
      ok(`GET /api/museum/${TEST_SUB} → 200`);
      if (m?.subdomain === TEST_SUB || m?.id) ok('박물관 데이터 정상 (subdomain 또는 id 존재)');
      else fail('박물관 데이터 shape', JSON.stringify(m)?.slice(0, 80));
    } else {
      fail(`GET /api/museum/${TEST_SUB}`, `status=${r.status}`);
    }
  } catch (e) { fail(`GET /api/museum/${TEST_SUB}`, e.message); }
}

async function testSubdomainAssign() {
  section('4. Subdomain 자동배정 (POST /api/subdomain/assign)');
  try {
    const r = await httpsPost('/api/subdomain/assign', {
      surnameKo: '테',
      bonGwanKo: '테스트',
    });
    if (r.status === 200 || r.status === 201) {
      const sub = r.body?.subdomain;
      if (sub) ok(`subdomain 배정 성공: ${sub}`);
      else fail('subdomain 필드 없음', JSON.stringify(r.body)?.slice(0, 80));
    } else {
      fail('POST /api/subdomain/assign', `status=${r.status} body=${JSON.stringify(r.body)?.slice(0,100)}`);
    }
  } catch (e) { fail('POST /api/subdomain/assign', e.message); }
}

function testAuthMe() {
  section('5. 인증된 GET /api/auth/me (EC2 내부)');
  const data = ec2Curl('GET', '/api/auth/me');
  if (data.__error) { fail('GET /api/auth/me (JWT)', data.__error); return; }
  const uid = data.data?.id ?? data.user?.id ?? data.id;
  if (uid === TEST_USER) {
    ok(`GET /api/auth/me → user.id=${uid}`);
  } else {
    fail('GET /api/auth/me (JWT)', JSON.stringify(data)?.slice(0, 100));
  }
}

function testMuseumMine() {
  section('6. GET /api/museum/mine (관장 박물관 목록)');
  const data = ec2Curl('GET', '/api/museum/mine');
  if (data.__error) { fail('GET /api/museum/mine', data.__error); return; }
  const sites = Array.isArray(data) ? data : (data.data ?? data.museums ?? []);
  if (sites.length > 0) {
    const sub = sites.find(s => s.subdomain === TEST_SUB);
    ok(`GET /api/museum/mine → ${sites.length}개 반환`);
    if (sub) ok(`${TEST_SUB} 포함 확인`);
    else fail(`${TEST_SUB} 미포함`, `반환된 subdomains: ${sites.map(s=>s.subdomain).join(',')}`);
  } else {
    fail('GET /api/museum/mine', `빈 배열 또는 파싱 오류: ${JSON.stringify(data)?.slice(0,100)}`);
  }
}

function testArchiveAccess() {
  section('7. 자료실 접근 (GET /api/museum/:subdomain 관장 권한)');
  const data = ec2Curl('GET', `/api/museum/${TEST_SUB}`);
  if (data.__error) { fail('GET /api/museum/:subdomain (JWT)', data.__error); return; }
  const m = data.data ?? data.museum ?? data;
  if (m?.subdomain === TEST_SUB || m?.id) {
    ok(`관장 토큰으로 /api/museum/${TEST_SUB} 접근 성공`);
  } else {
    fail('자료실 접근', JSON.stringify(data)?.slice(0, 100));
  }
}

function testTreeAccess() {
  section('8. 가족트리 (GET /api/tree/:subdomain)');
  const data = ec2Curl('GET', `/api/tree/${TEST_SUB}`);
  if (data.__error) { fail('GET /api/tree/:subdomain', data.__error); return; }
  if (data.nodes !== undefined || Array.isArray(data.persons) || data.success !== false) {
    ok(`GET /api/tree/${TEST_SUB} → 응답 정상`);
  } else {
    fail('GET /api/tree/:subdomain', JSON.stringify(data)?.slice(0, 100));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 메인
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n🧪 Orgcell E2E 테스트 시작\n');
  console.log(`  대상 서버 : ${BASE_URL}`);
  console.log(`  테스트 박물관: ${TEST_SUB}`);

  try {
    await testHealth();
    await testAuthPublic();
    await testMuseumPublic();
    await testSubdomainAssign();
    testAuthMe();
    testMuseumMine();
    testArchiveAccess();
    testTreeAccess();
  } catch (e) {
    console.error('\n💥 예상치 못한 오류:', e.message);
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`결과: ✅ ${passed}개 통과 / ❌ ${failed}개 실패`);
  if (failures.length > 0) {
    console.log('실패 항목:');
    failures.forEach(f => console.log(`  - ${f}`));
    console.log('\n🚫 테스트 실패 — 수정 후 재실행하세요.');
  } else {
    console.log('\n✅ 전체 통과 — 배포 가능합니다.');
  }
  console.log('═'.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
