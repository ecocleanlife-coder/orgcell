/**
 * OPS 파이프라인 통합 테스트 (실제 스키마 기반)
 * 실행: docker exec -w /app orgcell-backend node test_ops_pipeline.js
 */
const { Client } = require('pg');

const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL || 'postgresql://orgcell_user:orgcell_secure_2026@orgcell-db:5432/orgcell',
};

async function run() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('DB 연결 성공');

  try {
    // 정리
    await client.query("DELETE FROM person_paths WHERE path LIKE 'testlee-ops%'");
    await client.query(
      `DELETE FROM person_relations WHERE site_id = (SELECT id FROM family_sites WHERE subdomain = 'testlee-ops' LIMIT 1)`
    );
    await client.query(
      `DELETE FROM persons WHERE site_id = (SELECT id FROM family_sites WHERE subdomain = 'testlee-ops' LIMIT 1)`
    );
    await client.query("DELETE FROM family_sites WHERE subdomain = 'testlee-ops'");
    console.log('정리 완료');

    // Step 1: 박물관 생성
    const { rows: siteRows } = await client.query(
      `INSERT INTO family_sites (user_id, subdomain, theme, status)
       VALUES (1, 'testlee-ops', 'modern', 'active') RETURNING *`
    );
    const site = siteRows[0];
    console.log('Step1 family_sites: id=' + site.id + ', subdomain=' + site.subdomain);

    // 관장 person
    const curatorId = 'KR-TEST1';
    await client.query(
      `INSERT INTO persons (site_id, name, gender, oc_id, person_id, nationality, match_status, user_id)
       VALUES ($1, '이관장', 'male', $2, $2, 'KR', 'linked', 1)`,
      [site.id, curatorId]
    );
    await client.query(
      `INSERT INTO person_paths (path, person_id, is_canonical) VALUES ('testlee-ops', $1, TRUE)`,
      [curatorId]
    );
    console.log('Step1 관장 person_id=' + curatorId + ', path=testlee-ops');

    // Step 2: 아내 등록
    const wifeId = 'KR-TEST2';
    await client.query(
      `INSERT INTO persons (site_id, name, gender, oc_id, person_id, nationality, match_status)
       VALUES ($1, '이아내', 'female', $2, $2, 'KR', 'ghost')`,
      [site.id, wifeId]
    );
    await client.query(
      `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
       SELECT $1,
         (SELECT id FROM persons WHERE person_id=$2 LIMIT 1),
         (SELECT id FROM persons WHERE person_id=$3 LIMIT 1),
         'spouse', TRUE`,
      [site.id, curatorId, wifeId]
    );
    await client.query(
      `INSERT INTO person_paths (path, person_id, is_canonical) VALUES ('testlee-ops/w', $1, TRUE)`,
      [wifeId]
    );
    console.log('Step2 아내 person_id=' + wifeId + ', path=testlee-ops/w');

    // Step 3: 아들
    const sonId = 'KR-TEST3';
    await client.query(
      `INSERT INTO persons (site_id, name, gender, oc_id, person_id, nationality, match_status)
       VALUES ($1, '이아들', 'male', $2, $2, 'KR', 'ghost')`,
      [site.id, sonId]
    );
    await client.query(
      `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
       SELECT $1,
         (SELECT id FROM persons WHERE person_id=$2 LIMIT 1),
         (SELECT id FROM persons WHERE person_id=$3 LIMIT 1),
         'parent-child', TRUE`,
      [site.id, curatorId, sonId]
    );
    await client.query(
      `INSERT INTO person_paths (path, person_id, is_canonical) VALUES ('testlee-ops/s1', $1, TRUE)`,
      [sonId]
    );
    console.log('Step3 아들 person_id=' + sonId + ', path=testlee-ops/s1');

    // Step 4: 딸
    const daughterId = 'KR-TEST4';
    await client.query(
      `INSERT INTO persons (site_id, name, gender, oc_id, person_id, nationality, match_status)
       VALUES ($1, '이딸', 'female', $2, $2, 'KR', 'ghost')`,
      [site.id, daughterId]
    );
    await client.query(
      `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
       SELECT $1,
         (SELECT id FROM persons WHERE person_id=$2 LIMIT 1),
         (SELECT id FROM persons WHERE person_id=$3 LIMIT 1),
         'parent-child', TRUE`,
      [site.id, curatorId, daughterId]
    );
    await client.query(
      `INSERT INTO person_paths (path, person_id, is_canonical) VALUES ('testlee-ops/d1', $1, TRUE)`,
      [daughterId]
    );
    console.log('Step4 딸 person_id=' + daughterId + ', path=testlee-ops/d1');

    // 검증
    console.log('\n== 최종 검증 ==');
    const { rows: persons } = await client.query(
      `SELECT p.name, p.person_id, p.gender, pp.path, pp.is_canonical
       FROM persons p
       JOIN person_paths pp ON pp.person_id = p.person_id
       WHERE p.site_id = $1
       ORDER BY pp.path`,
      [site.id]
    );
    persons.forEach(function(p) {
      console.log('  ' + p.path + ' -> ' + p.name + ' (' + p.person_id + ') canonical=' + p.is_canonical);
    });

    const { rows: rels } = await client.query(
      `SELECT p1.name AS p1, p2.name AS p2, pr.relation_type
       FROM person_relations pr
       JOIN persons p1 ON p1.id = pr.person1_id
       JOIN persons p2 ON p2.id = pr.person2_id
       WHERE pr.site_id = $1`,
      [site.id]
    );
    console.log('\n  관계:');
    rels.forEach(function(r) {
      console.log('    ' + r.p1 + ' -[' + r.relation_type + ']-> ' + r.p2);
    });

    // person_paths 테이블 확인
    const { rows: allPaths } = await client.query(
      `SELECT path, person_id, is_canonical FROM person_paths WHERE path LIKE 'testlee-ops%' ORDER BY path`
    );
    console.log('\n  person_paths:');
    allPaths.forEach(function(pp) {
      console.log('    ' + pp.path + ' -> ' + pp.person_id);
    });

    console.log('\n통합 테스트 완료');
  } catch (err) {
    console.error('오류:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch(function(err) {
  process.exit(1);
});
