import { describe, expect, it } from 'vitest'
import { sourceErrorMessage, type ExternalSource } from '../source-error-message'

const SOURCES: ExternalSource[] = ['courts', 'matches', 'events', 'tournament']

describe('sourceErrorMessage', () => {
  it.each(SOURCES)('returns a non-empty block message for %s', (source) => {
    const msg = sourceErrorMessage(source, 'block')
    expect(msg.title.length).toBeGreaterThan(0)
    expect(msg.body.length).toBeGreaterThan(0)
  })

  it('returns a non-empty inline message for tournament', () => {
    const msg = sourceErrorMessage('tournament', 'inline')
    expect(msg.body.length).toBeGreaterThan(0)
    expect(msg.title).toBe('')
  })
})
