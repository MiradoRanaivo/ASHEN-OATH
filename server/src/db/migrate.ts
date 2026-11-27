import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { RowDataPacket } from "mysql2";
import { pool } from "./pool";

const migrationsDirectory = join(__dirname, "migrations");
const migrationLockName = "ashen_oath_schema_migrations";

async function runMigrations(): Promise<void> {
  const connection = await pool.getConnection();
  let lockAcquired = false;

  try {
    const [lockRows] = await connection.query<RowDataPacket[]>(
      "SELECT GET_LOCK(?, 10) AS acquired",
      [migrationLockName],
    );

    lockAcquired = lockRows[0]?.acquired === 1;
    if (!lockAcquired) {
      throw new Error("Could not acquire the database migration lock.");
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    const migrationFiles = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const [appliedRows] = await connection.execute<RowDataPacket[]>(
        "SELECT name FROM schema_migrations WHERE name = ?",
        [file],
      );

      if (appliedRows.length > 0) {
        console.info(`Migration already applied: ${file}`);
        continue;
      }

      const sql = readFileSync(join(migrationsDirectory, file), "utf8");
      const statements = sql
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean);

      console.info(`Applying migration: ${file}`);

      // MySQL DDL statements may commit implicitly; migrations are therefore
      // recorded only after every statement in the file succeeds.
      for (const statement of statements) {
        await connection.query(statement);
      }

      await connection.execute(
        "INSERT INTO schema_migrations (name) VALUES (?)",
        [file],
      );
      console.info(`Migration applied: ${file}`);
    }
  } finally {
    if (lockAcquired) {
      try {
        await connection.query("SELECT RELEASE_LOCK(?)", [migrationLockName]);
      } catch (error) {
        console.error("Could not release the database migration lock:", error);
      }
    }

    connection.release();
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
