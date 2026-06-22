import { describe, expect, it } from 'vitest'
import { openDb } from '../db'
import { generatePresentationCode, isValidPresentationCode, normalizePresentationCode, reservePresentationCode } from '../presentation-code'

describe('presentation code', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizePresentationCode(' wai 0426 ')).toBe('WAI-0426')
    expect(normalizePresentationCode('wai_0426')).toBe('WAI-0426')
  })

  it('validates readable codes', () => {
    expect(isValidPresentationCode('WAI-0426')).toBe(true)
    expect(isValidPresentationCode('wai_0426')).toBe(true)
    expect(isValidPresentationCode('BAD')).toBe(false)
  })

  it('generates a month/year code', () => {
    expect(generatePresentationCode(new Date('2026-06-21T00:00:00Z'))).toBe('WAI-0626')
  })

  it('reserves a collision-free suffix', () => {
    const d = openDb(':memory:')
    d.prepare(
      `INSERT INTO presentations (
        code, title, slug, moderator_sub, moderator_name, viewer_password_hash,
        status, livekit_room_name, starts_at, ended_at, created_at, updated_at
      ) VALUES ('WAI-0626', 'Title', 'title', 'sub', NULL, 'hash', 'draft', 'room-1', NULL, NULL, 1, 1)`,
    ).run()
    expect(reservePresentationCode(d, 'WAI-0626')).toBe('WAI-06262')
    d.close()
  })
})
