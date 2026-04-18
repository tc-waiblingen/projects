import { describe, expect, it } from 'vitest'
import { openDb } from '../db'

describe('db', () => {
  it('opens an in-memory database with the assignments schema', () => {
    const d = openDb(':memory:')
    const tables = d
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>
    expect(tables.map((t) => t.name)).toContain('assignments')
    expect(tables.map((t) => t.name)).toContain('app_settings')
    d.close()
  })

  it('applies the date index', () => {
    const d = openDb(':memory:')
    const indexes = d
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'assignments'")
      .all() as Array<{ name: string }>
    expect(indexes.map((i) => i.name)).toContain('assignments_date_idx')
    d.close()
  })

  it('is idempotent (re-applying schema does not error)', () => {
    const d = openDb(':memory:')
    expect(() => openDb(':memory:')).not.toThrow()
    d.close()
  })
})
