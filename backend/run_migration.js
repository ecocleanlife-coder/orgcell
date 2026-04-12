const { Client } = require('pg');
const client = new Client({
  user: 'orgcell_user',
  password: 'orgcellpass',
  host: 'localhost',
  port: 5432,
  database: 'orgcell',

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
