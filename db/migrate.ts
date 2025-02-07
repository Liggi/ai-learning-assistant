import { getDb } from "./connection";
import * as initialSchema from "./migrations/001-initial-schema";

const migrations = [initialSchema];

export async function migrate(): Promise<void> {
  const db = getDb();

  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Get the number of applied migrations
  const appliedMigrations = db
    .prepare("SELECT COUNT(*) as count FROM migrations")
    .get() as { count: number };

  // Apply any new migrations
  for (let i = appliedMigrations.count; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`Applying migration ${i + 1}...`);

    migration.up();

    db.prepare("INSERT INTO migrations (name, created_at) VALUES (?, ?)").run(
      `migration-${i + 1}`,
      new Date().toISOString()
    );

    console.log(`Migration ${i + 1} applied successfully.`);
  }
}

export async function rollback(): Promise<void> {
  const db = getDb();

  // Get the number of applied migrations
  const appliedMigrations = db
    .prepare("SELECT COUNT(*) as count FROM migrations")
    .get() as { count: number };

  if (appliedMigrations.count > 0) {
    const lastMigration = migrations[appliedMigrations.count - 1];
    console.log(`Rolling back migration ${appliedMigrations.count}...`);

    lastMigration.down();

    db.prepare(
      "DELETE FROM migrations WHERE id = (SELECT MAX(id) FROM migrations)"
    ).run();

    console.log(
      `Migration ${appliedMigrations.count} rolled back successfully.`
    );
  } else {
    console.log("No migrations to roll back.");
  }
}
