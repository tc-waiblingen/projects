import { describe, expect, it } from 'vitest'
import { formatEbusyDate } from '../endpoints'

describe('formatEbusyDate', () => {
  it('formats as dd.mm.yy with zero padding', () => {
    expect(formatEbusyDate(new Date(2026, 0, 5))).toBe('05.01.26')
    expect(formatEbusyDate(new Date(2026, 11, 31))).toBe('31.12.26')
  })
})
