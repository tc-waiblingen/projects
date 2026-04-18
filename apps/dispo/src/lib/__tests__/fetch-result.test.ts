import { afterEach, describe, expect, it, vi } from 'vitest'
import { settle } from '../fetch-result'

describe('settle', () => {
  const originalConsoleError = console.error
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('returns ok result when the promise resolves', async () => {
    const result = await settle(Promise.resolve(42))
    expect(result).toEqual({ ok: true, data: 42 })
  })

  it('returns error result when the promise rejects', async () => {
    const err = new Error('boom')
    console.error = vi.fn()
    const result = await settle(Promise.reject(err))
    expect(result).toEqual({ ok: false, error: err })
  })

  it('logs the error via console.error on rejection', async () => {
    const err = new Error('boom')
    const spy = vi.fn()
    console.error = spy
    await settle(Promise.reject(err))
    expect(spy).toHaveBeenCalledWith('External fetch failed:', err)
  })
})
