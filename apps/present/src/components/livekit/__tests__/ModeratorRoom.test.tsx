import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModeratorRoom } from '../ModeratorRoom'

const livekitMock = vi.hoisted(() => {
  class MockRoom {
    localParticipant = {
      connectionQuality: 'unknown',
      setScreenShareEnabled: vi.fn(),
    }
    name = 'tcw-present-wai-0626'
    remoteParticipants = new Map()
    state = 'connected'

    async connect() {
      return undefined
    }

    disconnect() {
      return undefined
    }

    async getSid() {
      return 'RM_TEST'
    }

    on() {
      return this
    }
  }

  return { MockRoom }
})

vi.mock('livekit-client', () => ({
  ConnectionQuality: {
    Excellent: 'excellent',
    Good: 'good',
    Lost: 'lost',
    Poor: 'poor',
    Unknown: 'unknown',
  },
  ConnectionState: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    Reconnecting: 'reconnecting',
  },
  Room: livekitMock.MockRoom,
  RoomEvent: {
    ConnectionQualityChanged: 'connectionQualityChanged',
    ConnectionStateChanged: 'connectionStateChanged',
    LocalTrackUnpublished: 'localTrackUnpublished',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
  },
  ScreenSharePresets: {
    h1080fps15: { encoding: { maxBitrate: 2_500_000 } },
    h360fps15: { encoding: { maxBitrate: 400_000 } },
    h720fps15: { encoding: { maxBitrate: 1_200_000 } },
  },
  Track: {
    Source: {
      ScreenShare: 'screen_share',
    },
  },
  createLocalScreenTracks: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: (props: { alt: string; className?: string; height: number; src: string; width: number }) => createElement('img', props),
}))

vi.mock('../livekit-dom', () => ({
  attachVideoTrack: vi.fn(),
  detachVideoTrack: vi.fn(),
}))

vi.mock('../livekit-stats', () => ({
  readMediaPath: vi.fn(() => 'Waiting'),
}))

describe('ModeratorRoom', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          room: 'tcw-present-wai-0626',
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

  it('warns when a live presentation has no screen share published', () => {
    render(<Room initialStatus="live" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Live without screen share')
  })

  it('does not warn before the presentation is live', () => {
    render(<Room initialStatus="ready" />)

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('restarts an ended presentation before requesting a moderator token', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        room: 'tcw-present-wai-0626',
        token: 'token',
        url: 'ws://localhost:7880',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<Room initialStatus="ended" />)

    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/presentations/WAI-0626/go-live', { method: 'POST' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/livekit/moderator-token',
        expect.objectContaining({
          body: JSON.stringify({ code: 'WAI-0626' }),
        }),
      ),
    )
  })
})

function Room({ initialStatus }: { initialStatus: 'draft' | 'ready' | 'live' | 'ended' }) {
  return (
    <ModeratorRoom
      code="WAI-0626"
      initialStatus={initialStatus}
      title="Jahreshauptversammlung"
      viewerQrDataUrl="data:image/png;base64,qr"
      viewerUrl="https://present.tc-waiblingen.de/p/WAI-0626"
    />
  )
}
