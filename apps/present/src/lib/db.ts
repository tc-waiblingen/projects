import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import path from 'path'

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS presentations (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    code                 TEXT    NOT NULL UNIQUE,
    title                TEXT    NOT NULL,
    slug                 TEXT    NOT NULL,
    moderator_sub        TEXT    NOT NULL,
    moderator_name       TEXT,
    viewer_password_hash TEXT    NOT NULL,
    status               TEXT    NOT NULL CHECK (status IN ('draft', 'ready', 'live', 'ended')),
    livekit_room_name    TEXT    NOT NULL UNIQUE,
    starts_at            TEXT,
    ended_at             INTEGER,
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS presentations_moderator_idx ON presentations (moderator_sub, updated_at)`,
  `CREATE INDEX IF NOT EXISTS presentations_status_idx ON presentations (status, starts_at)`,
  `CREATE TABLE IF NOT EXISTS presentation_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    presentation_id INTEGER NOT NULL,
    type            TEXT    NOT NULL,
    payload_json    TEXT,
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS presentation_events_presentation_idx ON presentation_events (presentation_id, created_at)`,
]

export function applySchema(d: Database.Database): void {
  for (const sql of SCHEMA_STATEMENTS) {
    d.prepare(sql).run()
  }
}

export function openDb(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') {
    mkdirSync(path.dirname(dbPath), { recursive: true })
  }
  const d = new Database(dbPath)
  d.pragma('foreign_keys = ON')
  if (dbPath !== ':memory:') {
    d.pragma('journal_mode = WAL')
  }
  applySchema(d)
  return d
}

let singleton: Database.Database | null = null

export function getDb(): Database.Database {
  if (singleton) return singleton
  const dbPath = process.env.PRESENT_DB_PATH || './data/present.db'
  singleton = openDb(dbPath)
  return singleton
}
