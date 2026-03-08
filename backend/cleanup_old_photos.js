require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        console.log('Connecting to database...');

        // Check what we have
        const res = await pool.query(`
            SELECT id, original_name, created_at 
            FROM photos 
            WHERE created_at < '2026-03-07 13:00:00'
        `);

        console.log(`Found ${res.rowCount} photos before 2026-03-07 13:00`);

        if (res.rowCount > 0) {
            const deleteRes = await pool.query(`
                DELETE FROM photos 
                WHERE created_at < '2026-03-07 13:00:00'
            `);
            console.log(`Deleted ${deleteRes.rowCount} old photos.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
