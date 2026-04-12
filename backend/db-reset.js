const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://orgcell_user:orgcellpass@db:5432/orgcell',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

async function resetDb() {
  try {
    console.log('DB 초기화를 시작합니다...');
    await pool.query('TRUNCATE TABLE users, albums, photos, face_descriptors, photo_albums, photo_faces, share_rooms, room_participants, room_exchanges, duplicate_groups, duplicate_members RESTART IDENTITY CASCADE;');
    console.log('성공: 모든 데이터가 삭제되고 ID가 초기화되었습니다.');
    process.exit(0);
  } catch (err) {
    console.error('실패:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDb();