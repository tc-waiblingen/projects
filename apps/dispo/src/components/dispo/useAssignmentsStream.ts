'use client'

import { useEffect, useRef } from 'react'
import type { MatchAssignmentInput } from '@/lib/assignments'
import type { MatchPlanInput } from '@/lib/match-plans'

export interface RemoteSnapshot {
  rows: MatchAssignmentInput[]
  plans: MatchPlanInput[]
  origin: string | null
  savedAt: number
  kind: 'snapshot' | 'update'
}

export const CLIENT_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `c${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

export interface UseAssignmentsStreamInput {
  date: string
  onRemote: (snapshot: RemoteSnapshot) => void
}

export function useAssignmentsStream({ date, onRemote }: UseAssignmentsStreamInput): void {
  const onRemoteRef = useRef(onRemote)
  useEffect(() => {
    onRemoteRef.current = onRemote
  }, [onRemote])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return
    const url = `/api/assignments/stream?date=${encodeURIComponent(date)}`
    const source = new EventSource(url)

    const handle = (kind: 'snapshot' | 'update') => (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as {
          rows: MatchAssignmentInput[]
          plans: MatchPlanInput[]
          origin: string | null
          savedAt: number
        }
        if (parsed.origin && parsed.origin === CLIENT_ID) return
        onRemoteRef.current({ ...parsed, kind })
      } catch {
        // ignore malformed messages
      }
    }

    const onSnapshot = handle('snapshot')
    const onUpdate = handle('update')
    source.addEventListener('snapshot', onSnapshot)
    source.addEventListener('update', onUpdate)

    return () => {
      source.removeEventListener('snapshot', onSnapshot)
      source.removeEventListener('update', onUpdate)
      source.close()
    }
  }, [date])
}
