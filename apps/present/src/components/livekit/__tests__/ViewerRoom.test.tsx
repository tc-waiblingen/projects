import { render, screen, waitFor } from '@testing-library/react'
import { RoomEvent, Track } from 'livekit-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ViewerRoom } from '../ViewerRoom'
import { attachVideoTrack, detachVideoTrack } from '../livekit-dom'

const livekitMock = vi.hoisted(() => {
  const connect = vi.fn(async () => undefined)
  const rooms: MockRoom[] = []
  let initialParticipants: Array<{
    trackPublications: Map<string, MockPublication>
  }> = []

  class MockRoom {
    state = 'connected'
    remoteParticipants = new Map<string, { trackPublications: Map<string, MockPublication> }>()
    private handlers = new Map<string, Array<(...args: unknown[]) => void>>()

    constructor() {
      initialParticipants.forEach((participant, index) => {
        this.remoteParticipants.set(`participant-${index}`, participant)
      })
      rooms.push(this)
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      const handlers = this.handlers.get(event) ?? []
      handlers.push(handler)
      this.handlers.set(event, handlers)
      return this
    }

    async connect(url: string, token: string) {
      return connect(url, token)
    }

    disconnect() {
      return undefined
    }

    emit(event: string, ...args: unknown[]) {
      this.handlers.get(event)?.forEach((handler) => handler(...args))
    }
  }

  return {
    MockRoom,
    connect,
    rooms,
    reset() {
      connect.mockClear()
      rooms.length = 0
      initialParticipants = []
    },
    setInitialParticipants(participants: Array<{ trackPublications: Map<string, MockPublication> }>) {
      initialParticipants = participants
    },
  }
})

interface MockTrack {
  kind: string
  getRTCStatsReport?: () => Promise<RTCStatsReport>
}

interface MockPublication {
  kind: string
  source: string
  trackName: string
  track?: MockTrack
  setSubscribed: ReturnType<typeof vi.fn>
}

vi.mock('livekit-client', () => ({
  ConnectionState: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    Reconnecting: 'reconnecting',
  },
  Room: livekitMock.MockRoom,
  RoomEvent: {
    ConnectionStateChanged: 'connectionStateChanged',
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
  },
  Track: {
    Kind: {
      Audio: 'audio',
      Video: 'video',
    },
    Source: {
      ScreenShare: 'screen_share',
      Unknown: 'unknown',
    },
  },
}))

vi.mock('../livekit-dom', () => ({
  attachVideoTrack: vi.fn(),
  detachVideoTrack: vi.fn(),
}))

vi.mock('../livekit-stats', () => ({
  readMediaPath: vi.fn(() => 'UDP host -> srflx'),
}))

describe('ViewerRoom', () => {
  beforeEach(() => {
    livekitMock.reset()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          room: 'tcw-present-smk',
          token: 'token',
          url: 'ws://localhost:7880',
        }),
      })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('attaches an already-published unknown video publication after connect', async () => {
    const track = {
      getRTCStatsReport: vi.fn(async () => new Map() as RTCStatsReport),
      kind: Track.Kind.Video,
    }
    const publication = {
      kind: Track.Kind.Video,
      setSubscribed: vi.fn(),
      source: Track.Source.Unknown,
      trackName: 'screen',
      track,
    }
    livekitMock.setInitialParticipants([{ trackPublications: new Map([['track', publication]]) }])

    render(<ViewerRoom code="SMK-TEST" initialStatus="live" title="Local smoke" />)

    await waitFor(() => expect(attachVideoTrack).toHaveBeenCalledWith(track, expect.any(HTMLVideoElement)))
    expect(publication.setSubscribed).toHaveBeenCalledWith(true)
  })

  it('stays in waiting state without connecting while the presentation is not live', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Presentation is not live' }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = render(<ViewerRoom code="SMK-TEST" initialStatus="ready" title="Local smoke" />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/livekit/viewer-token', expect.any(Object)))
    expect(livekitMock.connect).not.toHaveBeenCalled()
    expect(screen.getByText(/Waiting for the moderator to share a screen/i)).toBeInTheDocument()

    unmount()
  })

  it('keeps unknown non-screen video publications detached', async () => {
    const track = {
      getRTCStatsReport: vi.fn(async () => new Map() as RTCStatsReport),
      kind: Track.Kind.Video,
    }
    const publication = {
      kind: Track.Kind.Video,
      setSubscribed: vi.fn(),
      source: Track.Source.Unknown,
      trackName: 'camera',
      track,
    }
    livekitMock.setInitialParticipants([{ trackPublications: new Map([['track', publication]]) }])

    render(<ViewerRoom code="SMK-TEST" initialStatus="live" title="Local smoke" />)

    await waitFor(() => expect(livekitMock.rooms).toHaveLength(1))
    expect(publication.setSubscribed).not.toHaveBeenCalled()
    expect(attachVideoTrack).not.toHaveBeenCalled()
  })

  it('keeps unknown audio publications detached', async () => {
    const track = { kind: Track.Kind.Audio }
    const publication = {
      kind: Track.Kind.Audio,
      setSubscribed: vi.fn(),
      source: Track.Source.Unknown,
      trackName: 'screen',
      track,
    }

    render(<ViewerRoom code="SMK-TEST" initialStatus="live" title="Local smoke" />)
    await waitFor(() => expect(livekitMock.rooms).toHaveLength(1))

    livekitMock.rooms[0]?.emit(RoomEvent.TrackSubscribed, track, publication)

    expect(attachVideoTrack).not.toHaveBeenCalled()
  })

  it('detaches an unknown video publication when it is unsubscribed', async () => {
    const track = {
      getRTCStatsReport: vi.fn(async () => new Map() as RTCStatsReport),
      kind: Track.Kind.Video,
    }
    const publication = {
      kind: Track.Kind.Video,
      setSubscribed: vi.fn(),
      source: Track.Source.Unknown,
      trackName: 'screen',
      track,
    }

    render(<ViewerRoom code="SMK-TEST" initialStatus="live" title="Local smoke" />)
    await waitFor(() => expect(livekitMock.rooms).toHaveLength(1))

    livekitMock.rooms[0]?.emit(RoomEvent.TrackSubscribed, track, publication)
    await waitFor(() => expect(attachVideoTrack).toHaveBeenCalledWith(track, expect.any(HTMLVideoElement)))

    livekitMock.rooms[0]?.emit(RoomEvent.TrackUnsubscribed, track, publication)

    await waitFor(() => expect(detachVideoTrack).toHaveBeenCalledWith(track, expect.any(HTMLVideoElement)))
  })

  it('keeps the replacement screen track live when the old track unsubscribes later', async () => {
    const firstTrack = {
      getRTCStatsReport: vi.fn(async () => new Map() as RTCStatsReport),
      kind: Track.Kind.Video,
    }
    const secondTrack = {
      getRTCStatsReport: vi.fn(async () => new Map() as RTCStatsReport),
      kind: Track.Kind.Video,
    }
    const firstPublication = {
      kind: Track.Kind.Video,
      setSubscribed: vi.fn(),
      source: Track.Source.ScreenShare,
      trackName: 'screen',
      track: firstTrack,
    }
    const secondPublication = {
      kind: Track.Kind.Video,
      setSubscribed: vi.fn(),
      source: Track.Source.ScreenShare,
      trackName: 'screen',
      track: secondTrack,
    }

    render(<ViewerRoom code="SMK-TEST" initialStatus="live" title="Local smoke" />)
    await waitFor(() => expect(livekitMock.rooms).toHaveLength(1))

    livekitMock.rooms[0]?.emit(RoomEvent.TrackSubscribed, firstTrack, firstPublication)
    await waitFor(() => expect(attachVideoTrack).toHaveBeenCalledWith(firstTrack, expect.any(HTMLVideoElement)))

    livekitMock.rooms[0]?.emit(RoomEvent.TrackSubscribed, secondTrack, secondPublication)
    await waitFor(() => expect(attachVideoTrack).toHaveBeenCalledWith(secondTrack, expect.any(HTMLVideoElement)))
    await waitFor(() => expect(screen.queryByText(/Waiting for the moderator to share a screen/i)).toBeNull())

    livekitMock.rooms[0]?.emit(RoomEvent.TrackUnsubscribed, firstTrack, firstPublication)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.queryByText(/Waiting for the moderator to share a screen/i)).toBeNull()
    expect(detachVideoTrack).toHaveBeenCalledWith(firstTrack, expect.any(HTMLVideoElement))
    expect(detachVideoTrack).not.toHaveBeenCalledWith(secondTrack, expect.any(HTMLVideoElement))
  })
})
