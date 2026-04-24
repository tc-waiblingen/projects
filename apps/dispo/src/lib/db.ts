import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import path from 'path'

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS assignments (
    match_id   TEXT    NOT NULL,
    court_id   INTEGER NOT NULL,
    match_date TEXT    NOT NULL,
    match_time TEXT    NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, court_id)
  )`,
  `CREATE INDEX IF NOT EXISTS assignments_date_idx ON assignments (match_date)`,
  `CREATE TABLE IF NOT EXISTS match_plans (
    match_id   TEXT    NOT NULL,
    match_date TEXT    NOT NULL,
    start_time TEXT    NOT NULL,
    duration_h REAL    NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, match_date)
  )`,
  `CREATE INDEX IF NOT EXISTS match_plans_date_idx ON match_plans (match_date)`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT    PRIMARY KEY,
    value      TEXT    NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
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
  if (dbPath !== ':memory:') {
    d.pragma('journal_mode = WAL')
  }
  applySchema(d)
  return d
}

let singleton: Database.Database | null = null

export function getDb(): Database.Database {
  if (singleton) return singleton
  const dbPath = process.env.DISPO_DB_PATH || './data/dispo.db'
  singleton = openDb(dbPath)
  return singleton
}
