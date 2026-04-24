import { getAssignmentsForDate, type MatchAssignmentInput } from '@/lib/assignments'
import { type AssignmentsUpdate, subscribe } from '@/lib/assignments-bus'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { parseIsoDate } from '@/lib/format'
import { getPlansForDate, type MatchPlanInput } from '@/lib/match-plans'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 15_000

function snapshotForDate(date: string): { rows: MatchAssignmentInput[]; plans: MatchPlanInput[] } {
  const db = getDb()
  const assignmentRows = getAssignmentsForDate(db, date)
  const byMatch = new Map<string, MatchAssignmentInput>()
  for (const row of assignmentRows) {
    const existing = byMatch.get(row.matchId)
    if (existing) {
      existing.courtIds.push(row.courtId)
    } else {
      byMatch.set(row.matchId, {
        matchId: row.matchId,
        matchTime: row.matchTime,
        courtIds: [row.courtId],
      })
    }
  }
  const plans: MatchPlanInput[] = getPlansForDate(db, date).map((p) => ({
    matchId: p.matchId,
    startTime: p.startTime,
    durationH: p.durationH,
  }))
  return { rows: [...byMatch.values()], plans }
}

function formatEvent(eventName: string, data: unknown): string {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const date = request.nextUrl.searchParams.get('date')
  if (!date || !parseIsoDate(date)) {
    return new Response(JSON.stringify({ error: 'Invalid date' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const close = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeatId)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
      const send = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          close()
        }
      }

      const initial = snapshotForDate(date)
      const snapshotPayload: AssignmentsUpdate = {
        date,
        rows: initial.rows,
        plans: initial.plans,
        origin: null,
        savedAt: Date.now(),
      }
      send(formatEvent('snapshot', snapshotPayload))

      const unsubscribe = subscribe(date, (update) => {
        send(formatEvent('update', update))
      })

      const heartbeatId = setInterval(() => {
        send(': heartbeat\n\n')
      }, HEARTBEAT_MS)

      request.signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
