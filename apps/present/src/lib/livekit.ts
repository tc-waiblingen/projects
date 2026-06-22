import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk'
import type { Presentation } from './presentations'

export interface LiveKitConfig {
  url: string
  apiUrl: string
  apiKey: string
  apiSecret: string
}

export function getLiveKitConfig(): LiveKitConfig {
  const url = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!url || !apiKey || !apiSecret) {
    throw new Error('LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set')
  }
  return { url, apiUrl: liveKitApiUrl(url), apiKey, apiSecret }
}

export function liveKitApiUrl(url: string): string {
  const parsed = new URL(url)
  if (parsed.protocol === 'wss:') parsed.protocol = 'https:'
  else if (parsed.protocol === 'ws:') parsed.protocol = 'http:'
  else throw new Error('LIVEKIT_URL must use ws:// or wss://')
  return parsed.toString().replace(/\/$/, '')
}

export async function createModeratorToken(presentation: Presentation, identity: string, name?: string): Promise<string> {
  const config = getLiveKitConfig()
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name,
    ttl: '2h',
    metadata: JSON.stringify({ role: 'moderator', presentationId: presentation.id }),
  })
  token.addGrant({
    room: presentation.livekitRoomName,
    roomJoin: true,
    canPublish: true,
    canPublishSources: [TrackSource.SCREEN_SHARE],
    canPublishData: false,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  })
  return token.toJwt()
}

export async function createViewerToken(presentation: Presentation, viewerId: string): Promise<string> {
  const config = getLiveKitConfig()
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: viewerId,
    name: 'Viewer',
    ttl: '2h',
    metadata: JSON.stringify({ role: 'viewer', presentationId: presentation.id }),
  })
  token.addGrant({
    room: presentation.livekitRoomName,
    roomJoin: true,
    canPublish: false,
    canPublishData: false,
    canSubscribe: true,
  })
  return token.toJwt()
}

export function getRoomServiceClient(): RoomServiceClient {
  const config = getLiveKitConfig()
  return new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret)
}

export async function ensureLiveKitRoom(presentation: Presentation): Promise<void> {
  const client = getRoomServiceClient()
  await client.createRoom({
    name: presentation.livekitRoomName,
    emptyTimeout: 10 * 60,
    maxParticipants: 300,
  }).catch((error: unknown) => {
    if (error instanceof Error && /already exists/i.test(error.message)) return
    throw error
  })
}

export async function closeLiveKitRoom(presentation: Presentation): Promise<void> {
  const client = getRoomServiceClient()
  await client.deleteRoom(presentation.livekitRoomName).catch(() => undefined)
}
