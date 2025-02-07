import { getDb } from "../connection";

export function up(): void {
  const db = getDb();

  // Create subjects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create calibration_settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calibration_settings (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      selected_knowledge_nodes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
  `);

  // Create roadmap_nodes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roadmap_nodes (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      position TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
  `);

  // Create roadmap_edges table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roadmap_edges (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (source) REFERENCES roadmap_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target) REFERENCES roadmap_nodes(id) ON DELETE CASCADE
    );
  `);

  // Create chat_messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
  `);
}

export function down(): void {
  const db = getDb();

  // Drop tables in reverse order of creation
  db.exec(`
    DROP TABLE IF EXISTS chat_messages;
    DROP TABLE IF EXISTS roadmap_edges;
    DROP TABLE IF EXISTS roadmap_nodes;
    DROP TABLE IF EXISTS calibration_settings;
    DROP TABLE IF EXISTS subjects;
  `);
}
