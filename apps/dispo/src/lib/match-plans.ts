import type Database from 'better-sqlite3'

export interface MatchPlanRow {
  matchId: string
  matchDate: string
  startTime: string
  durationH: number
  updatedAt: number
}

export interface MatchPlanInput {
  matchId: string
  startTime: string
  durationH: number
}

export function getPlansForDate(db: Database.Database, date: string): MatchPlanRow[] {
  const stmt = db.prepare(`
    SELECT
      match_id   AS matchId,
      match_date AS matchDate,
      start_time AS startTime,
      duration_h AS durationH,
      updated_at AS updatedAt
    FROM match_plans
    WHERE match_date = ?
  `)
  return stmt.all(date) as MatchPlanRow[]
}

export function replacePlansForDate(
  db: Database.Database,
  date: string,
  plans: MatchPlanInput[],
  now: number = Math.floor(Date.now() / 1000),
): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM match_plans WHERE match_date = ?').run(date)
    const insert = db.prepare(`
      INSERT INTO match_plans (match_id, match_date, start_time, duration_h, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const plan of plans) {
      insert.run(plan.matchId, date, plan.startTime, plan.durationH, now)
    }
  })
  tx()
}
