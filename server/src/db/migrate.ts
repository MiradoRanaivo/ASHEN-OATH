import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pool } from "./pool";

const migrationsDirectory = join(__dirname, "migrations");

async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [7_341_902]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name varchar(255) PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const migrationFiles = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const alreadyApplied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [file],
      );

      if (alreadyApplied.rowCount) {
        console.info(`Migration already applied: ${file}`);
        continue;
      }

      const sql = readFileSync(join(migrationsDirectory, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.info(`Migration applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [7_341_902]);
    } finally {
      client.release();
    }
  }
}

runMigrations()
  .catch((error: unknown) => {
    console.error("Database migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
