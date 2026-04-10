/**
 * seed_family.js — 4대 가족 시드 데이터 생성기
 *
 * 실행:
 *   node scripts/seed_family.js                       # LEE006-1 박물관에 주입
 *   node scripts/seed_family.js --subdomain LEE-1     # 특정 subdomain
 *   node scripts/seed_family.js --clear               # 기존 시드 삭제 후 재생성
 *   node scripts/seed_family.js --dry-run             # DB 주입 없이 콘솔 출력만
 *
 * 생성 구조 (50명):
 *   1대 (증조부모): 4명
 *   2대 (조부모세대): 16명 (조부모 2쌍 + 형제자매 + 배우자)
 *   3대 (부모세대): 16명 (부모 1쌍 + 형제자매 + 배우자)
 *   4대 (관장세대): 14명 (관장 + 배우자 + 형제 + 배우자형제 + 자녀)
 *
 * §7 person_id 규칙: KR- + 5자리 (O/0/I/1/L 제외)
 * §19 persons + person_relations 테이블에 주입
 */

// scripts/는 자체 node_modules 없음 → backend의 패키지 사용
const backendModules = require('path').resolve(__dirname, '../backend/node_modules');
require(require('path').join(backendModules, 'dotenv')).config({
  path: require('path').resolve(__dirname, '../backend/.env'),
});
const { Client } = require(require('path').join(backendModules, 'pg'));

// ── CLI 인수 파싱 ──────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const isDry  = args.includes('--dry-run');
const isClear = args.includes('--clear');
const subIdx = args.indexOf('--subdomain');
const SUBDOMAIN = subIdx !== -1 ? args[subIdx + 1] : 'LEE006-1';

// ── §7 person_id 생성 ────────────────────────────────────────────────────────
const CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';  // O/0/I/1/L 제외
const usedIds = new Set();

function genPersonId(prefix = 'KR') {
  let id;
  do {
    id = prefix + '-' + Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

// ── 한국어 이름 데이터 ────────────────────────────────────────────────────────
const SURNAMES_M = ['이', '김', '박', '최', '정', '강', '조', '윤', '장', '임'];
const SURNAMES_F = ['김', '박', '이', '최', '정', '한', '오', '서', '신', '권'];
const GIVEN_M    = ['준호', '민준', '상훈', '동현', '재원', '성민', '영수', '도현', '현우', '준서'];
const GIVEN_F    = ['수아', '지은', '민지', '예린', '수연', '지현', '소연', '하은', '유진', '미나'];

let _nameIdx = 0;
function makeName(gender) {
  const idx = _nameIdx++ % 10;
  if (gender === 'M') return `${SURNAMES_M[idx]}${GIVEN_M[idx]}`;
  return `${SURNAMES_F[idx]}${GIVEN_F[idx]}`;
}

function makeBirth(baseYear, variance = 3) {
  const year  = baseYear + Math.floor(Math.random() * variance * 2) - variance;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day   = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── 가계도 빌더 ───────────────────────────────────────────────────────────────
function buildFamilyTree() {
  const persons   = [];   // { person_id, name, gender, birth_date }
  const relations = [];   // { person_id_1, person_id_2, relation_type }

  function addPerson(gender, birthYear) {
    const p = { person_id: genPersonId(), name: makeName(gender), gender, birth_date: makeBirth(birthYear), match_status: 'ghost' };
    persons.push(p);
    return p;
  }

  function addCouple(mBirth, fBirth) {
    const h = addPerson('M', mBirth);
    const w = addPerson('F', fBirth);
    relations.push({ person_id_1: h.person_id, person_id_2: w.person_id, relation_type: 'spouse' });
    relations.push({ person_id_1: w.person_id, person_id_2: h.person_id, relation_type: 'spouse' });
    return { h, w };
  }

  function addChild(father, mother, gender, birthYear) {
    const child = addPerson(gender, birthYear);
    if (father) relations.push({ person_id_1: father.person_id, person_id_2: child.person_id, relation_type: 'parent-child' });
    if (mother) relations.push({ person_id_1: mother.person_id, person_id_2: child.person_id, relation_type: 'parent-child' });
    return child;
  }

  function addSiblings(parent1, parent2, count, birthYear) {
    const sibs = [];
    for (let i = 0; i < count; i++) {
      const g = i % 2 === 0 ? 'M' : 'F';
      sibs.push(addChild(parent1, parent2, g, birthYear + i * 2));
    }
    // 형제 관계 연결
    for (let i = 0; i < sibs.length; i++) {
      for (let j = i + 1; j < sibs.length; j++) {
        relations.push({ person_id_1: sibs[i].person_id, person_id_2: sibs[j].person_id, relation_type: 'sibling' });
        relations.push({ person_id_1: sibs[j].person_id, person_id_2: sibs[i].person_id, relation_type: 'sibling' });
      }
    }
    return sibs;
  }

  // ══ 1대 (증조부모, 1930년대) — 4명 ══════════════════════════════════════════
  const greatGP_pat = addCouple(1925, 1928);   // 부계 증조부모
  const greatGP_mat = addCouple(1927, 1930);   // 모계 증조부모

  // ══ 2대 (조부모세대, 1950년대) — 16명 ════════════════════════════════════════
  // 부계: 증조부모의 자녀 4명 (조부 포함) + 배우자
  const gf_pat = addChild(greatGP_pat.h, greatGP_pat.w, 'M', 1950);  // 조부
  const gf_pat_siblings = addSiblings(greatGP_pat.h, greatGP_pat.w, 3, 1952); // 조부 형제 3명
  const gm_pat = addPerson('F', 1953);  // 조모 (외부 가문)
  relations.push({ person_id_1: gf_pat.person_id, person_id_2: gm_pat.person_id, relation_type: 'spouse' });
  relations.push({ person_id_1: gm_pat.person_id, person_id_2: gf_pat.person_id, relation_type: 'spouse' });
  // 조부 형제들 배우자
  gf_pat_siblings.forEach(s => {
    const sp = addPerson(s.gender === 'M' ? 'F' : 'M', 1953);
    relations.push({ person_id_1: s.person_id, person_id_2: sp.person_id, relation_type: 'spouse' });
    relations.push({ person_id_1: sp.person_id, person_id_2: s.person_id, relation_type: 'spouse' });
  });

  // 모계: 증조부모의 자녀 3명 (외조부 포함) + 배우자
  const gf_mat = addChild(greatGP_mat.h, greatGP_mat.w, 'M', 1952);  // 외조부
  addSiblings(greatGP_mat.h, greatGP_mat.w, 2, 1954);                 // 외조부 형제 2명
  const gm_mat = addPerson('F', 1955);   // 외조모
  relations.push({ person_id_1: gf_mat.person_id, person_id_2: gm_mat.person_id, relation_type: 'spouse' });
  relations.push({ person_id_1: gm_mat.person_id, person_id_2: gf_mat.person_id, relation_type: 'spouse' });

  // ══ 3대 (부모세대, 1975년대) — 16명 ══════════════════════════════════════════
  // 아버지 = 조부모의 자녀, 형제 3명
  const father = addChild(gf_pat, gm_pat, 'M', 1975);
  const father_sibs = addSiblings(gf_pat, gm_pat, 3, 1977);

  // 어머니 = 외조부모의 자녀, 형제 2명
  const mother = addChild(gf_mat, gm_mat, 'F', 1978);
  addSiblings(gf_mat, gm_mat, 2, 1980);

  // 아버지-어머니 부부
  relations.push({ person_id_1: father.person_id, person_id_2: mother.person_id, relation_type: 'spouse' });
  relations.push({ person_id_1: mother.person_id, person_id_2: father.person_id, relation_type: 'spouse' });

  // 아버지 형제들 배우자
  father_sibs.forEach(s => {
    const sp = addPerson(s.gender === 'M' ? 'F' : 'M', 1978);
    relations.push({ person_id_1: s.person_id, person_id_2: sp.person_id, relation_type: 'spouse' });
    relations.push({ person_id_1: sp.person_id, person_id_2: s.person_id, relation_type: 'spouse' });
  });

  // 어머니측 부모 (배우자 부모)
  const mat_gf = addPerson('M', 1950);
  const mat_gm = addPerson('F', 1952);
  relations.push({ person_id_1: mat_gf.person_id, person_id_2: mat_gm.person_id, relation_type: 'spouse' });
  relations.push({ person_id_1: mat_gm.person_id, person_id_2: mat_gf.person_id, relation_type: 'spouse' });
  relations.push({ person_id_1: mat_gf.person_id, person_id_2: mother.person_id, relation_type: 'parent-child' });
  relations.push({ person_id_1: mat_gm.person_id, person_id_2: mother.person_id, relation_type: 'parent-child' });

  // ══ 4대 (관장세대, 2000년대) — 14명 ═════════════════════════════════════════
  // 관장 = 아버지-어머니의 장남
  const curator = addChild(father, mother, 'M', 2000);
  curator.match_status = 'linked';  // 관장은 linked 상태

  // 관장 형제 2명
  const curator_sibs = addSiblings(father, mother, 2, 2002);

  // 관장 배우자
  const spouse = addPerson('F', 2002);
  relations.push({ person_id_1: curator.person_id, person_id_2: spouse.person_id, relation_type: 'spouse' });
  relations.push({ person_id_1: spouse.person_id, person_id_2: curator.person_id, relation_type: 'spouse' });

  // 배우자 부모
  const sp_father = addPerson('M', 1975);
  const sp_mother = addPerson('F', 1977);
  relations.push({ person_id_1: sp_father.person_id, person_id_2: sp_mother.person_id, relation_type: 'spouse' });
  relations.push({ person_id_1: sp_mother.person_id, person_id_2: sp_father.person_id, relation_type: 'spouse' });
  relations.push({ person_id_1: sp_father.person_id, person_id_2: spouse.person_id, relation_type: 'parent-child' });
  relations.push({ person_id_1: sp_mother.person_id, person_id_2: spouse.person_id, relation_type: 'parent-child' });

  // 배우자 형제 2명
  addSiblings(sp_father, sp_mother, 2, 2004);

  // 관장 자녀 4명
  addSiblings(curator, spouse, 4, 2025);

  // 관장 형제 배우자
  curator_sibs.forEach(s => {
    const sp2 = addPerson(s.gender === 'M' ? 'F' : 'M', 2003);
    relations.push({ person_id_1: s.person_id, person_id_2: sp2.person_id, relation_type: 'spouse' });
    relations.push({ person_id_1: sp2.person_id, person_id_2: s.person_id, relation_type: 'spouse' });
  });

  return { persons, relations, curator };
}

// ── DB 주입 ───────────────────────────────────────────────────────────────────
async function seedToDb(persons, relations, curator, subdomain) {
  const client = new Client({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  console.log('DB 연결 성공');

  try {
    await client.query('BEGIN');

    if (isClear) {
      // 시드 데이터 삭제 (match_status='ghost' + created_by='seed' 조건)
      await client.query(`DELETE FROM person_relations WHERE person_id_1 IN (SELECT person_id FROM persons WHERE created_by='seed')`);
      await client.query(`DELETE FROM persons WHERE created_by='seed'`);
      console.log('기존 시드 데이터 삭제 완료');
    }

    // persons 삽입
    let insertedPersons = 0;
    for (const p of persons) {
      await client.query(
        `INSERT INTO persons (person_id, name, gender, birth_date, match_status, created_by)
         VALUES ($1, $2, $3, $4, $5, 'seed')
         ON CONFLICT (person_id) DO NOTHING`,
        [p.person_id, p.name, p.gender, p.birth_date, p.match_status || 'ghost']
      );
      insertedPersons++;
    }
    console.log(`  ✅ persons 삽입: ${insertedPersons}명`);

    // person_relations 삽입
    let insertedRelations = 0;
    for (const r of relations) {
      await client.query(
        `INSERT INTO person_relations (person_id_1, person_id_2, relation_type)
         VALUES ($1, $2, $3)
         ON CONFLICT ON CONSTRAINT uq_person_relation DO NOTHING`,
        [r.person_id_1, r.person_id_2, r.relation_type]
      );
      insertedRelations++;
    }
    console.log(`  ✅ person_relations 삽입: ${insertedRelations}건`);

    // sites 업데이트 — 관장 연결
    const siteRes = await client.query(`SELECT id FROM sites WHERE subdomain = $1`, [subdomain]);
    if (siteRes.rows.length > 0) {
      await client.query(
        `UPDATE sites SET owner_person_id = $1 WHERE subdomain = $2`,
        [curator.person_id, subdomain]
      );
      console.log(`  ✅ sites.owner_person_id 업데이트: ${subdomain} → ${curator.person_id}`);
    } else {
      await client.query(
        `INSERT INTO sites (subdomain, owner_person_id, display_name) VALUES ($1, $2, $3)`,
        [subdomain, curator.person_id, `${subdomain} 가족유산박물관`]
      );
      console.log(`  ✅ sites 신규 생성: ${subdomain}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ 시드 주입 완료');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱 Orgcell 가족 시드 데이터 생성`);
  console.log(`  subdomain : ${SUBDOMAIN}`);
  console.log(`  dry-run   : ${isDry}`);
  console.log(`  clear     : ${isClear}\n`);

  const { persons, relations, curator } = buildFamilyTree();

  console.log(`생성 완료:`);
  console.log(`  persons        : ${persons.length}명`);
  console.log(`  person_relations: ${relations.length}건`);
  console.log(`  관장 person_id  : ${curator.person_id} (${curator.name})`);

  if (isDry) {
    console.log('\n[DRY-RUN] 샘플 persons:');
    persons.slice(0, 5).forEach(p => console.log(`  ${p.person_id} | ${p.name} | ${p.gender} | ${p.birth_date}`));
    console.log('  ...');
    console.log('\n[DRY-RUN] 샘플 relations:');
    relations.slice(0, 5).forEach(r => console.log(`  ${r.person_id_1} → ${r.person_id_2} (${r.relation_type})`));
    console.log('\n-- DB 주입 생략 (--dry-run 모드) --');
    return;
  }

  await seedToDb(persons, relations, curator, SUBDOMAIN);
  console.log(`\n박물관: ${SUBDOMAIN}`);
  console.log(`관장  : ${curator.name} (${curator.person_id})\n`);
}

main().catch(err => {
  console.error('❌ 시드 실패:', err.message);
  process.exit(1);
});
