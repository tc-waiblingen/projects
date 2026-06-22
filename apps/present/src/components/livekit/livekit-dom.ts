import type { Track } from 'livekit-client'

type AttachableTrack = Track & {
  attach: (element?: HTMLMediaElement) => HTMLMediaElement
  detach: (element?: HTMLMediaElement) => HTMLMediaElement[]
}

export function attachVideoTrack(track: Track, element: HTMLVideoElement): void {
  const attachable = track as AttachableTrack
  attachable.attach(element)
  element.play().catch(() => undefined)
}

export function detachVideoTrack(track: Track, element?: HTMLVideoElement | null): void {
  const attachable = track as AttachableTrack
  attachable.detach(element ?? undefined)
}
