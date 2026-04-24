import { describe, it, expect, vi } from 'vitest'
import { publish, subscribe, subscriberCount, type AssignmentsUpdate } from '../assignments-bus'

function makeUpdate(date: string): AssignmentsUpdate {
  return { date, rows: [], plans: [], origin: 'c1', savedAt: 1 }
}

describe('assignments-bus', () => {
  it('delivers publish to subscribers of the same date', () => {
    const handler = vi.fn()
    const unsub = subscribe('2026-05-01', handler)
    publish(makeUpdate('2026-05-01'))
    expect(handler).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('does not deliver to subscribers of a different date', () => {
    const a = vi.fn()
    const b = vi.fn()
    const ua = subscribe('2026-05-01', a)
    const ub = subscribe('2026-05-02', b)
    publish(makeUpdate('2026-05-01'))
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
    ua()
    ub()
  })

  it('unsubscribe stops delivery and cleans up empty entries', () => {
    const handler = vi.fn()
    const unsub = subscribe('2026-05-03', handler)
    expect(subscriberCount('2026-05-03')).toBe(1)
    unsub()
    expect(subscriberCount('2026-05-03')).toBe(0)
    publish(makeUpdate('2026-05-03'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('one subscriber throwing does not block others', () => {
    const bad = vi.fn().mockImplementation(() => {
      throw new Error('boom')
    })
    const good = vi.fn()
    const ua = subscribe('2026-05-04', bad)
    const ub = subscribe('2026-05-04', good)
    publish(makeUpdate('2026-05-04'))
    expect(bad).toHaveBeenCalledTimes(1)
    expect(good).toHaveBeenCalledTimes(1)
    ua()
    ub()
  })
})
