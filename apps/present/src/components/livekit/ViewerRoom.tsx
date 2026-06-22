'use client'

import { attachVideoTrack, detachVideoTrack } from '@/components/livekit/livekit-dom'
import { readMediaPath } from '@/components/livekit/livekit-stats'
import { ConnectionState, Room, RoomEvent, Track, type RemoteTrack, type RemoteTrackPublication } from 'livekit-client'
import { useEffect, useRef, useState } from 'react'

interface ViewerRoomProps {
  code: string
  title: string
  initialStatus: 'draft' | 'ready' | 'live' | 'ended'
}

interface TokenResponse {
  token: string
  url: string
  room: string
}

const SCREEN_TRACK_NAME = 'screen'

export function ViewerRoom({ code, title, initialStatus }: ViewerRoomProps) {
  const [connection, setConnection] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [state, setState] = useState<'waiting' | 'live' | 'reconnecting' | 'ended' | 'error'>(
    initialStatus === 'ended' ? 'ended' : 'waiting',
  )
  const [message, setMessage] = useState(
    initialStatus === 'ended' ? 'Presentation has ended.' : 'Waiting for the moderator to share a screen.',
  )
  const [mediaPath, setMediaPath] = useState('Waiting')
  const videoRef = useRef<HTMLVideoElement>(null)
  const currentTrackRef = useRef<RemoteTrack | null>(null)
  const attachedVideoElementRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (initialStatus === 'ended') return undefined
    let cancelled = false
    let retryTimer: number | undefined
    const room = new Room({ adaptiveStream: true, dynacast: true })

    function waitForLive() {
      if (cancelled) return
      setState('waiting')
      setMessage('Waiting for the moderator to share a screen.')
      retryTimer = window.setTimeout(connectRoom, 2000)
    }

    function attachIfScreenShare(track: RemoteTrack, publication: RemoteTrackPublication) {
      const videoElement = videoRef.current
      if (!isScreenVideoTrack(track, publication) || !videoElement) return
      if (currentTrackRef.current === track && attachedVideoElementRef.current === videoElement) return
      if (currentTrackRef.current) {
        detachVideoTrack(currentTrackRef.current, attachedVideoElementRef.current)
      }
      currentTrackRef.current = track
      attachedVideoElementRef.current = videoElement
      attachVideoTrack(track, videoElement)
      setState('live')
      setMessage('Live')
    }

    async function connectRoom() {
      try {
        const response = await fetch('/api/livekit/viewer-token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null
          if (response.status === 409 && data?.error === 'Presentation is not live') {
            waitForLive()
            return
          }
          if (response.status === 409 && data?.error === 'Presentation has ended') {
            setState('ended')
            setMessage('Presentation has ended.')
            return
          }
          throw new Error(data?.error || `Token request failed (${response.status})`)
        }
        const data = (await response.json()) as TokenResponse
        if (cancelled) return

        room.on(RoomEvent.ConnectionStateChanged, (next) => {
          setConnection(next)
          if (next === ConnectionState.Reconnecting) setState('reconnecting')
          if (next === ConnectionState.Disconnected && !cancelled) {
            setState('ended')
            setMessage('Presentation has ended.')
          }
        })
        room.on(RoomEvent.TrackSubscribed, attachIfScreenShare)
        room.on(RoomEvent.TrackUnsubscribed, (track, publication) => {
          if (!isScreenVideoTrack(track, publication)) return
          if (currentTrackRef.current !== track) return
          detachVideoTrack(track, attachedVideoElementRef.current)
          currentTrackRef.current = null
          attachedVideoElementRef.current = null
          setMediaPath('Waiting')
          setState('waiting')
          setMessage('Waiting for the moderator to share a screen.')
        })

        await room.connect(data.url, data.token)
        if (cancelled) {
          room.disconnect()
          return
        }
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (isScreenVideoPublication(publication)) publication.setSubscribed(true)
            if (publication.track) attachIfScreenShare(publication.track, publication)
          })
        })
        setConnection(room.state)
      } catch (err) {
        setState('error')
        setMessage(err instanceof Error ? err.message : 'Could not connect to presentation')
      }
    }

    connectRoom()
    return () => {
      cancelled = true
      if (retryTimer) window.clearTimeout(retryTimer)
      if (currentTrackRef.current) detachVideoTrack(currentTrackRef.current, attachedVideoElementRef.current)
      room.disconnect()
    }
  }, [code, initialStatus])

  useEffect(() => {
    if (state !== 'live') {
      setMediaPath('Waiting')
      return undefined
    }

    async function updateStats() {
      const report = await currentTrackRef.current?.getRTCStatsReport()
      if (!report) return
      const inbound = findInboundVideoStats(report)
      if (inbound) setMediaPath(readMediaPath(report, inbound))
    }

    updateStats()
    const interval = window.setInterval(updateStats, 2000)
    return () => window.clearInterval(interval)
  }, [state])

  return (
    <main
      className="grid min-h-screen grid-rows-[auto_minmax(0,1fr)] bg-[#101113] text-white"
      data-media-path={mediaPath}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs font-bold text-white/55 uppercase">TCW Present</p>
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
        <div className="text-right text-sm">
          <p className="font-mono text-white/70">{code}</p>
          <p className="text-white/50">{connection}</p>
        </div>
      </header>
      <section className="relative grid min-h-0 place-items-center">
        <video ref={videoRef} playsInline className="h-full w-full object-contain" />
        {state !== 'live' && (
          <div className="absolute inset-0 grid place-items-center bg-[#101113] p-6 text-center">
            <div>
              <p className="mb-2 text-xs font-bold text-white/45 uppercase">{state}</p>
              <p className="text-xl font-semibold">{message}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

function isScreenVideoPublication(publication: RemoteTrackPublication): boolean {
  if (publication.kind !== Track.Kind.Video) return false
  if (publication.source === Track.Source.ScreenShare) return true
  return publication.source === Track.Source.Unknown && publication.trackName === SCREEN_TRACK_NAME
}

function isScreenVideoTrack(track: RemoteTrack, publication: RemoteTrackPublication): boolean {
  return track.kind === Track.Kind.Video && isScreenVideoPublication(publication)
}

function findInboundVideoStats(report: RTCStatsReport): Record<string, unknown> | null {
  let match: Record<string, unknown> | null = null
  report.forEach((entry) => {
    const stat = entry as Record<string, unknown>
    if (
      stat.type === 'inbound-rtp' &&
      (stat.kind === 'video' || stat.mediaType === 'video') &&
      stat.isRemote !== true
    ) {
      match = stat
    }
  })
  return match
}
