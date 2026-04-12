require('dotenv').config();
const db = require('./src/config/db');

async function finalCleanup() {
  try {
    console.log('EC2 DB 최종 초기화를 시작합니다...');

    // 존재하는 테이블만 TRUNCATE (IF EXISTS 없으므로 개별 처리)
    const tables = [
      'magic_link_tokens',
      'person_relations',
      'person_paths',
      'persons',
      'site_media',
      'site_folders',
      'sites',
      'family_sites',
      'families',
      'accounts',
      'users',
    ];

    for (const table of tables) {
      try {
        await db.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log(`  ✓ ${table} 삭제 완료`);
      } catch (e) {
        if (e.code === '42P01') {
          console.log(`  - ${table} 테이블 없음 (스킵)`);
        } else {
          throw e;
        }
      }
    }

    console.log('\n=== 삭제 후 COUNT 검증 ===');
    for (const table of tables) {
      try {
        const r = await db.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ${table}: ${r.rows[0].count}건`);
      } catch (e) {
        if (e.code === '42P01') {
          console.log(`  ${table}: (없음)`);
        }
      }
    }

    console.log('\n✅ 완료: 모든 데이터 초기화');
    process.exit(0);
  } catch (err) {
    console.error('❌ 실패:', err.message);
    process.exit(1);
  }
}

finalCleanup();
