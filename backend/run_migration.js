const { Client } = require("pg");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");

const DB_CONFIG = {
  user: "orgcell_user",
  password: "orgcell_secure_2026",
  host: "orgcell-db",
  port: 5432,
  database: "orgcell",
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000; // 5 seconds

async function createAndConnectClient(retries = MAX_RETRIES) {
  while (retries) {
    const client = new Client(DB_CONFIG);
    try {
      await client.connect();
      console.log("DB connected for migrations.");
      return client; // Return the connected client
    } catch (err) {
      console.error(`DB connection failed. Retries left: ${retries - 1}. Error: ${err.message}`);
      retries--;
      if (retries === 0) {
        console.error("Max retries reached. Exiting.");
        throw err; // No more retries, throw the last error
      }
      await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
    } finally {
      // If connection failed, ensure the client is ended to prevent resource leaks.
      // If connection succeeded, client will be returned and ended later in runMigrations.
      if (retries < MAX_RETRIES && retries > 0) { // If it's a retry and not the final failure
        await client.end().catch(e => console.error("Error ending client after failed connect:", e.message));
      }
    }
  }
}

async function runMigrations() {
  let client;
  try {
    client = await createAndConnectClient(); // Get a new connected client

    const migrationsDir = path.resolve(__dirname, "database", "migrations");
    console.log(`Debug: migrationsDir = ${migrationsDir}`);
    console.log(`Debug: migrationsDir exists = ${fs.existsSync(migrationsDir)}`);
    const files = await fsp.readdir(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith(".sql")).sort();

    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fsp.readFile(filePath, { encoding: "utf8" });
      console.log(`Running migration: ${file}`);
      await client.query(sql);
      console.log(`Migration ${file} successful.`);
    }

    console.log("All migrations successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    if (client) {
      await client.end();
      console.log("DB connection closed.");
    }
  }
}

runMigrations();
