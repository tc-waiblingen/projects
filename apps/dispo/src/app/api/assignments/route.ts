import { replaceAssignmentsForDate, type MatchAssignmentInput } from '@/lib/assignments'
import { getDb } from '@/lib/db'
import { parseIsoDate } from '@/lib/format'
import { replacePlansForDate, type MatchPlanInput } from '@/lib/match-plans'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const RowSchema = z.object({
  matchId: z.string().min(1),
  matchTime: z.string().regex(/^\d{2}:\d{2}$/),
  courtIds: z.array(z.number().int().positive()),
})

const PlanSchema = z.object({
  matchId: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationH: z.number().positive().max(14),
})

const BodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(RowSchema),
  plans: z.array(PlanSchema).optional(),
})

export async function POST(request: NextRequest) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 })
  }

  if (!parseIsoDate(parsed.data.date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const inputs: MatchAssignmentInput[] = parsed.data.rows.filter((r) => r.courtIds.length > 0)
  const planInputs: MatchPlanInput[] = parsed.data.plans ?? []

  try {
    const db = getDb()
    replaceAssignmentsForDate(db, parsed.data.date, inputs)
    replacePlansForDate(db, parsed.data.date, planInputs)
  } catch (err) {
    return NextResponse.json(
      { error: 'Database write failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, date: parsed.data.date, count: inputs.length, plans: planInputs.length })
}
