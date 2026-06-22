// @vitest-environment node
import { decodeJwt } from 'jose'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createModeratorToken, createViewerToken, getLiveKitConfig, liveKitApiUrl } from '../livekit'
import type { Presentation } from '../presentations'

const presentation: Presentation = {
  id: 1,
  code: 'WAI-0626',
  title: 'Jahreshauptversammlung',
  slug: 'jahreshauptversammlung',
  moderatorSub: 'entra:1',
  moderatorName: 'Tom',
  viewerPasswordHash: 'hash',
  status: 'live',
  livekitRoomName: 'tcw-present-wai-0626',
  startsAt: null,
  endedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('livekit', () => {
  beforeEach(() => {
    vi.stubEnv('LIVEKIT_URL', 'ws://localhost:7880')
    vi.stubEnv('LIVEKIT_API_KEY', 'devkey')
    vi.stubEnv('LIVEKIT_API_SECRET', 'devsecretdevsecretdevsecretdevsecret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads required config', () => {
    expect(getLiveKitConfig()).toEqual({
      url: 'ws://localhost:7880',
      apiUrl: 'http://localhost:7880',
      apiKey: 'devkey',
      apiSecret: 'devsecretdevsecretdevsecretdevsecret',
    })
  })

  it('derives the room API URL from the websocket URL', () => {
    expect(liveKitApiUrl('wss://live.tc-waiblingen.de')).toBe('https://live.tc-waiblingen.de')
    expect(liveKitApiUrl('ws://localhost:7880')).toBe('http://localhost:7880')
  })

  it('rejects non-websocket LiveKit URLs', () => {
    expect(() => liveKitApiUrl('https://live.tc-waiblingen.de')).toThrow('LIVEKIT_URL must use ws:// or wss://')
  })

  it('creates a screen-share-only moderator token', async () => {
    const token = await createModeratorToken(presentation, 'moderator:1', 'Tom')
    const claims = decodeJwt(token) as { metadata?: string; name?: string; sub?: string; video?: Record<string, unknown> }
    expect(claims.sub).toBe('moderator:1')
    expect(claims.name).toBe('Tom')
    expect(claims.metadata).toBe(JSON.stringify({ role: 'moderator', presentationId: 1 }))
    expect(claims.video).toMatchObject({
      room: 'tcw-present-wai-0626',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
      canPublishSources: ['screen_share'],
    })
    expect(claims.video?.canPublishSources).not.toContain('camera')
    expect(claims.video?.canPublishSources).not.toContain('microphone')
  })

  it('creates a subscribe-only viewer token', async () => {
    const token = await createViewerToken(presentation, 'viewer:1:abc')
    const claims = decodeJwt(token) as { metadata?: string; name?: string; sub?: string; video?: Record<string, unknown> }
    expect(claims.sub).toBe('viewer:1:abc')
    expect(claims.name).toBe('Viewer')
    expect(claims.metadata).toBe(JSON.stringify({ role: 'viewer', presentationId: 1 }))
    expect(claims.video).toMatchObject({
      room: 'tcw-present-wai-0626',
      roomJoin: true,
      canPublish: false,
      canPublishData: false,
      canSubscribe: true,
    })
    expect(claims.video).not.toHaveProperty('canPublishSources')
  })
})
