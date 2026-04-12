require('dotenv').config();
const db = require('./src/config/db');

async function cleanup() {
  try {
    console.log('DB 초기화를 시작합니다...');
    await db.query('TRUNCATE TABLE persons, families, family_sites, users RESTART IDENTITY CASCADE');
    console.log('성공: 모든 데이터가 삭제되고 ID가 초기화되었습니다.');
    process.exit(0);
  } catch (err) {
    console.error('실패:', err);
    process.exit(1);
  }
}
cleanup();