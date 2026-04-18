import { hash, verify } from '@node-rs/argon2'
import type Database from 'better-sqlite3'
import { getDb } from './db'

const PASSWORD_KEY = 'operator_password_hash'

// Argon2id is the library default. Params: 32 MiB, 5 iterations, 1 lane.
const ARGON2_OPTIONS = {
  memoryCost: 32 * 1024,
  timeCost: 5,
  parallelism: 1,
} as const

function getSetting(key: string, d: Database.Database = getDb()): string | null {
  const row = d.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

function setSetting(key: string, value: string, d: Database.Database = getDb()): void {
  d.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value, Date.now())
}

export function getPasswordHash(d?: Database.Database): string | null {
  return getSetting(PASSWORD_KEY, d)
}

export async function setPassword(plain: string, d?: Database.Database): Promise<void> {
  const encoded = await hash(plain, ARGON2_OPTIONS)
  setSetting(PASSWORD_KEY, encoded, d)
}

export async function verifyPassword(plain: string, d?: Database.Database): Promise<boolean> {
  const encoded = getPasswordHash(d)
  if (!encoded) return false
  try {
    return await verify(encoded, plain)
  } catch {
    return false
  }
}
