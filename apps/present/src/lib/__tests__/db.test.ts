import { describe, expect, it } from 'vitest'
import { openDb } from '../db'

describe('db', () => {
  it('opens an in-memory database with the presentation schema', () => {
    const d = openDb(':memory:')
    const tables = d
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>
    expect(tables.map((t) => t.name)).toContain('presentations')
    expect(tables.map((t) => t.name)).toContain('presentation_events')
    d.close()
  })

  it('applies useful indexes', () => {
    const d = openDb(':memory:')
    const indexes = d
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
      .all() as Array<{ name: string }>
    expect(indexes.map((i) => i.name)).toContain('presentations_moderator_idx')
    expect(indexes.map((i) => i.name)).toContain('presentation_events_presentation_idx')
    d.close()
  })

  it('is idempotent', () => {
    const d = openDb(':memory:')
    expect(() => openDb(':memory:')).not.toThrow()
    d.close()
  })
})
