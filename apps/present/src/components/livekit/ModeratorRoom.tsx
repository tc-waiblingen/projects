'use client'

import { attachVideoTrack, detachVideoTrack } from '@/components/livekit/livekit-dom'
import { readMediaPath } from '@/components/livekit/livekit-stats'
import {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  ScreenSharePresets,
  Track,
  createLocalScreenTracks,
  type LocalTrack,
  type LocalTrackPublication,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
} from 'livekit-client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const SCREEN_SHARE_CAPTURE_OPTIONS: ScreenShareCaptureOptions = {
  audio: false,
  video: true,
  resolution: { width: 1920, height: 1080, frameRate: 15 },
  contentHint: 'detail',
  surfaceSwitching: 'include',
  systemAudio: 'exclude',
}

const SCREEN_SHARE_PUBLISH_OPTIONS: TrackPublishOptions = {
  name: 'screen',
  source: Track.Source.ScreenShare,
  simulcast: true,
  screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
  screenShareSimulcastLayers: [ScreenSharePresets.h360fps15, ScreenSharePresets.h720fps15],
}

interface StatsSample {
  bytesSent: number
  timestamp: number
}

interface StreamStats {
  codec: string
  bitrate: string
  packetLoss: string
  mediaPath: string
}

const EMPTY_STREAM_STATS: StreamStats = {
  codec: 'Auto',
  bitrate: 'Waiting',
  packetLoss: 'n/a',
  mediaPath: 'Waiting',
}

interface ModeratorRoomProps {
  code: string
  title: string
  initialStatus: 'draft' | 'ready' | 'live' | 'ended'
  viewerUrl: string
  viewerQrDataUrl: string
}

interface TokenResponse {
  token: string
  url: string
  room: string
}

export function ModeratorRoom({ code, title, initialStatus, viewerUrl, viewerQrDataUrl }: ModeratorRoomProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [status, setStatus] = useState(initialStatus)
  const [shouldConnect, setShouldConnect] = useState(initialStatus !== 'ended')
  const [connectAttempt, setConnectAttempt] = useState(0)
  const [connection, setConnection] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [viewerCount, setViewerCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [sharingPending, setSharingPending] = useState(false)
  const [diagnostics, setDiagnostics] = useState('Not connected')
  const [roomName, setRoomName] = useState('Pending')
  const [roomSid, setRoomSid] = useState('Pending')
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown)
  const [streamStats, setStreamStats] = useState<StreamStats>(EMPTY_STREAM_STATS)
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenPublicationRef = useRef<LocalTrackPublication | null>(null)
  const statsSampleRef = useRef<StatsSample | null>(null)
  const liveWithoutScreen = status === 'live' && !sharing && !sharingPending

  useEffect(() => {
    if (!shouldConnect) return undefined
    let cancelled = false
    const nextRoom = new Room({ adaptiveStream: true, dynacast: true })

    async function connectRoom() {
      try {
        const response = await fetch('/api/livekit/moderator-token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        if (!response.ok) throw new Error(`Token request failed (${response.status})`)
        const data = (await response.json()) as TokenResponse
        if (cancelled) return

        nextRoom.on(RoomEvent.ConnectionStateChanged, (state) => setConnection(state))
        nextRoom.on(RoomEvent.ParticipantConnected, () => setViewerCount(nextRoom.remoteParticipants.size))
        nextRoom.on(RoomEvent.ParticipantDisconnected, () => setViewerCount(nextRoom.remoteParticipants.size))
        nextRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          if (participant.isLocal) setConnectionQuality(quality)
        })
        nextRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.source === Track.Source.ScreenShare) {
            screenPublicationRef.current = null
            statsSampleRef.current = null
            setSharing(false)
            setStreamStats(EMPTY_STREAM_STATS)
          }
        })

        await nextRoom.connect(data.url, data.token)
        if (cancelled) {
          nextRoom.disconnect()
          return
        }
        setRoom(nextRoom)
        setConnection(nextRoom.state)
        setViewerCount(nextRoom.remoteParticipants.size)
        setRoomName(nextRoom.name || data.room)
        setConnectionQuality(nextRoom.localParticipant.connectionQuality)
        setDiagnostics('Connected')
        nextRoom
          .getSid()
          .then((sid) => {
            if (!cancelled) setRoomSid(sid)
          })
          .catch(() => {
            if (!cancelled) setRoomSid('Unavailable')
          })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not connect to LiveKit')
      }
    }

    connectRoom()
    return () => {
      cancelled = true
      nextRoom.disconnect()
    }
  }, [code, connectAttempt, shouldConnect])

  useEffect(() => {
    if (!sharing) {
      statsSampleRef.current = null
      setStreamStats(EMPTY_STREAM_STATS)
      return undefined
    }

    async function updateStats() {
      const report = await screenPublicationRef.current?.track?.getRTCStatsReport()
      if (!report) return
      const next = readStreamStats(report, statsSampleRef.current)
      statsSampleRef.current = next.sample
      setStreamStats(next.stats)
    }

    updateStats()
    const interval = window.setInterval(updateStats, 2000)
    return () => window.clearInterval(interval)
  }, [sharing])

  async function startShare(eventType: 'screen_started' | 'screen_changed' = 'screen_started') {
    if (!room || sharingPending) return
    setError(null)
    setSharingPending(true)
    setDiagnostics('Screen share starting')
    try {
      const publication = await room.localParticipant.setScreenShareEnabled(
        true,
        SCREEN_SHARE_CAPTURE_OPTIONS,
        SCREEN_SHARE_PUBLISH_OPTIONS,
      )
      screenPublicationRef.current = publication ?? null
      if (publication?.track && videoRef.current) {
        attachVideoTrack(publication.track, videoRef.current)
      }
      setSharing(Boolean(publication))
      setDiagnostics('Screen share published')
      if (publication) recordScreenEvent(eventType)
    } catch (err) {
      setError(formatScreenShareError(err))
    } finally {
      setSharingPending(false)
    }
  }

  async function stopShare() {
    if (!room) return
    const publication = screenPublicationRef.current
    if (publication?.track) detachVideoTrack(publication.track, videoRef.current)
    await room.localParticipant.setScreenShareEnabled(false)
    screenPublicationRef.current = null
    statsSampleRef.current = null
    setSharing(false)
    setStreamStats(EMPTY_STREAM_STATS)
    setDiagnostics('Screen share stopped')
  }

  async function changeShare() {
    if (!room || sharingPending) return
    setError(null)
    setSharingPending(true)
    setDiagnostics('Screen share starting')
    const nextTracks: LocalTrack[] = []
    let replacementPublished = false
    try {
      nextTracks.push(...(await createLocalScreenTracks(SCREEN_SHARE_CAPTURE_OPTIONS)))
      const nextScreenTrack = nextTracks.find((track) => track.source === Track.Source.ScreenShare)
      if (!nextScreenTrack) throw new Error('No screen-share video track found')

      await stopShare()
      const publication = await room.localParticipant.publishTrack(nextScreenTrack, SCREEN_SHARE_PUBLISH_OPTIONS)
      replacementPublished = true
      screenPublicationRef.current = publication
      if (publication.track && videoRef.current) {
        attachVideoTrack(publication.track, videoRef.current)
      }
      setSharing(true)
      setDiagnostics('Screen share published')
      recordScreenEvent('screen_changed')
    } catch (err) {
      if (!replacementPublished) nextTracks.forEach((track) => track.stop())
      setError(formatScreenShareError(err))
    } finally {
      setSharingPending(false)
    }
  }

  function recordScreenEvent(type: 'screen_started' | 'screen_changed') {
    fetch(`/api/presentations/${code}/screen-event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type }),
    }).catch(() => undefined)
  }

  async function goLive() {
    setError(null)
    const response = await fetch(`/api/presentations/${code}/go-live`, {
      method: 'POST',
    })
    if (!response.ok) {
      setError(`Could not go live (${response.status})`)
      return
    }
    setStatus('live')
    if (!room) {
      setShouldConnect(true)
      setConnectAttempt((attempt) => attempt + 1)
    }
  }

  async function endPresentation() {
    await stopShare()
    const response = await fetch(`/api/presentations/${code}/end`, {
      method: 'POST',
    })
    if (!response.ok) {
      setError(`Could not end presentation (${response.status})`)
      return
    }
    setStatus('ended')
    setShouldConnect(false)
    setRoom(null)
    setConnection(ConnectionState.Disconnected)
    setViewerCount(0)
    setConnectionQuality(ConnectionQuality.Unknown)
    setDiagnostics('Presentation ended')
    setRoomName('Pending')
    setRoomSid('Pending')
    room?.disconnect()
  }

  return (
    <main className="min-h-screen bg-[#18191b] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs font-bold text-white/55 uppercase">Control Room</p>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="font-mono text-sm text-white/55">{code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={goLive}
            disabled={status === 'live'}
            className="cursor-pointer rounded-md bg-white px-4 py-2 font-semibold text-[#18191b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'ended' ? 'Restart' : 'Go live'}
          </button>
          <button
            onClick={endPresentation}
            disabled={status === 'ended'}
            className="cursor-pointer rounded-md bg-tcw-red-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            End
          </button>
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-lg border border-white/10 bg-black">
          <div className="aspect-video bg-[#101113]">
            <video ref={videoRef} muted playsInline className="h-full w-full bg-[#101113] object-contain" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#111214] p-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => startShare()}
                disabled={!room || sharing || sharingPending || status === 'ended'}
                className="cursor-pointer rounded-md bg-tcw-red-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start sharing
              </button>
              <button
                onClick={changeShare}
                disabled={!room || !sharing || sharingPending || status === 'ended'}
                className="cursor-pointer rounded-md border border-white/20 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Change screen
              </button>
              <button
                onClick={stopShare}
                disabled={!room || !sharing || sharingPending}
                className="cursor-pointer rounded-md border border-white/20 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stop
              </button>
            </div>
            <span className="text-sm text-white/60">
              {sharingPending ? 'Screen share starting' : sharing ? 'Screen share active' : 'No screen shared'}
            </span>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          {error && <div className="rounded-lg border border-tcw-red-500 bg-tcw-red-900/50 p-3 text-sm">{error}</div>}
          {liveWithoutScreen && (
            <div role="alert" className="rounded-lg border border-amber-400 bg-amber-500/15 p-3 text-sm font-semibold text-amber-100">
              Live without screen share
            </div>
          )}
          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 font-bold">Viewer access</h2>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
              <Image
                src={viewerQrDataUrl}
                alt={`QR code for ${viewerUrl}`}
                width={96}
                height={96}
                className="rounded bg-white p-1"
              />
              <div className="min-w-0">
                <p className="font-mono text-2xl font-bold">{code}</p>
                <p className="mt-2 text-sm break-all text-white/65">{viewerUrl}</p>
              </div>
            </div>
          </section>
          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 font-bold">Room health</h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Status</dt>
                <dd className="font-semibold">{status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Connection</dt>
                <dd className="font-semibold">{connection}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Viewers</dt>
                <dd className="font-semibold">{viewerCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Mode</dt>
                <dd className="font-semibold">Screen only</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 font-bold">Diagnostics</h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Room name</dt>
                <dd className="text-right font-semibold break-all">{roomName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Room SID</dt>
                <dd className="text-right font-semibold break-all">{roomSid}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Quality</dt>
                <dd className="font-semibold">{formatConnectionQuality(connectionQuality)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Screen</dt>
                <dd className="text-right font-semibold break-all">{diagnostics}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Codec</dt>
                <dd className="font-semibold">{streamStats.codec}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Bitrate</dt>
                <dd className="font-semibold">{streamStats.bitrate}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Packet loss</dt>
                <dd className="font-semibold">{streamStats.packetLoss}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Media path</dt>
                <dd className="text-right font-semibold break-all">{streamStats.mediaPath}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Target</dt>
                <dd className="font-semibold">1080p / 15 fps</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  )
}

function readStreamStats(
  report: RTCStatsReport,
  previous: StatsSample | null,
): { sample: StatsSample; stats: StreamStats } {
  const outbound = findOutboundVideoStats(report)
  if (!outbound) {
    return {
      sample: previous ?? { bytesSent: 0, timestamp: Date.now() },
      stats: EMPTY_STREAM_STATS,
    }
  }

  const bytesSent = readNumber(outbound.bytesSent)
  const timestamp = readNumber(outbound.timestamp) || Date.now()
  const codecId = typeof outbound.codecId === 'string' ? outbound.codecId : undefined
  const codecStat = codecId ? (report.get(codecId) as Record<string, unknown> | undefined) : undefined
  const codec = readCodec(codecStat)
  const bitrate =
    previous && timestamp > previous.timestamp
      ? formatBitrate(((bytesSent - previous.bytesSent) * 8 * 1000) / (timestamp - previous.timestamp))
      : 'Measuring'

  return {
    sample: { bytesSent, timestamp },
    stats: {
      codec,
      bitrate,
      packetLoss: readPacketLoss(findRemoteInboundStats(report, outbound.id)),
      mediaPath: readMediaPath(report, outbound),
    },
  }
}

function findOutboundVideoStats(report: RTCStatsReport): Record<string, unknown> | null {
  let match: Record<string, unknown> | null = null
  report.forEach((entry) => {
    const stat = entry as Record<string, unknown>
    if (
      stat.type === 'outbound-rtp' &&
      (stat.kind === 'video' || stat.mediaType === 'video') &&
      stat.isRemote !== true
    ) {
      match = stat
    }
  })
  return match
}

function findRemoteInboundStats(report: RTCStatsReport, localId: unknown): Record<string, unknown> | null {
  if (typeof localId !== 'string') return null
  let match: Record<string, unknown> | null = null
  report.forEach((entry) => {
    const stat = entry as Record<string, unknown>
    if (stat.type === 'remote-inbound-rtp' && stat.localId === localId) {
      match = stat
    }
  })
  return match
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readCodec(codecStat: Record<string, unknown> | undefined): string {
  const mimeType = typeof codecStat?.mimeType === 'string' ? codecStat.mimeType : undefined
  return mimeType?.replace(/^video\//, '').toUpperCase() || 'Auto'
}

function readPacketLoss(stat: Record<string, unknown> | null): string {
  if (!stat) return 'n/a'
  const lost = readNumber(stat.packetsLost)
  const received = readNumber(stat.packetsReceived)
  const total = lost + received
  if (total <= 0) return 'n/a'
  return `${((lost / total) * 100).toFixed(1)}%`
}

function formatBitrate(bitsPerSecond: number): string {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return 'Measuring'
  if (bitsPerSecond >= 1_000_000) return `${(bitsPerSecond / 1_000_000).toFixed(1)} Mbps`
  return `${Math.round(bitsPerSecond / 1_000)} kbps`
}

function formatConnectionQuality(quality: ConnectionQuality): string {
  switch (quality) {
    case ConnectionQuality.Excellent:
      return 'Excellent'
    case ConnectionQuality.Good:
      return 'Good'
    case ConnectionQuality.Poor:
      return 'Poor'
    case ConnectionQuality.Lost:
      return 'Lost'
    case ConnectionQuality.Unknown:
    default:
      return 'Unknown'
  }
}

function formatScreenShareError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/invalidstateerror|invalid state|user activation/i.test(message)) {
    return 'Screen sharing must be started from a direct browser click. Click Start sharing in the browser window and select a screen.'
  }
  if (/could not start video source|notallowederror|notreadableerror|permission/i.test(message)) {
    return 'Screen sharing was blocked by the browser or operating system. Allow screen recording for this browser and try again.'
  }
  return message || 'Screen sharing failed'
}
