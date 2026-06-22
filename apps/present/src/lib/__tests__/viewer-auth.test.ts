// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signViewerToken, verifyViewerToken, viewerCookieName } from '../viewer-auth'

const SECRET = 'a'.repeat(32)

describe('viewer auth', () => {
  beforeEach(() => {
    vi.stubEnv('PRESENT_SESSION_SECRET', SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips viewer sessions', async () => {
    const token = await signViewerToken({ presentationId: 3, code: 'WAI-0626', viewerId: 'viewer:3:abc' })
    await expect(verifyViewerToken(token)).resolves.toEqual({
      presentationId: 3,
      code: 'WAI-0626',
      viewerId: 'viewer:3:abc',
    })
  })

  it('rejects empty and malformed tokens', async () => {
    await expect(verifyViewerToken(undefined)).resolves.toBeNull()
    await expect(verifyViewerToken('bad')).resolves.toBeNull()
  })

  it('uses presentation-specific viewer cookie names', () => {
    expect(viewerCookieName('WAI-0626')).toBe('present_viewer_wai-0626')
  })
})
