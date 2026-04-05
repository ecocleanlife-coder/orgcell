const { Client } = require('pg');
const client = new Client({
  user: 'nci_admin',
  password: '8FEm0bLQZ6aFWWz1ur7^ftuz',
  host: 'nci-sage-pro-dev-db.cjwiuoomek1b.ap-northeast-2.rds.amazonaws.com',
  port: 5432,
  database: 'orgcell',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE persons 
      ADD COLUMN IF NOT EXISTS display_info1 VARCHAR(50), 
      ADD COLUMN IF NOT EXISTS display_info2 VARCHAR(50), 
      ADD COLUMN IF NOT EXISTS display_info3 VARCHAR(50);
    `);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}
run();
