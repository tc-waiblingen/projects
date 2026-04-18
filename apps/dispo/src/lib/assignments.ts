import type Database from 'better-sqlite3'

export interface AssignmentRow {
  matchId: string
  courtId: number
  matchDate: string
  matchTime: string
  updatedAt: number
}

export interface MatchAssignmentInput {
  matchId: string
  matchTime: string
  courtIds: number[]
}

export interface Conflict {
  courtId: number
  matchTime: string
  matchIds: string[]
}

export function getAssignmentsForDate(db: Database.Database, date: string): AssignmentRow[] {
  const stmt = db.prepare(`
    SELECT
      match_id   AS matchId,
      court_id   AS courtId,
      match_date AS matchDate,
      match_time AS matchTime,
      updated_at AS updatedAt
    FROM assignments
    WHERE match_date = ?
    ORDER BY match_time, match_id, court_id
  `)
  return stmt.all(date) as AssignmentRow[]
}

export function replaceAssignmentsForDate(
  db: Database.Database,
  date: string,
  matches: MatchAssignmentInput[],
  now: number = Math.floor(Date.now() / 1000),
): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM assignments WHERE match_date = ?').run(date)
    const insert = db.prepare(`
      INSERT INTO assignments (match_id, court_id, match_date, match_time, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const match of matches) {
      for (const courtId of match.courtIds) {
        insert.run(match.matchId, courtId, date, match.matchTime, now)
      }
    }
  })
  tx()
}

export function getAssignmentCountsByMatchForYear(
  db: Database.Database,
  year: number,
): Map<string, number> {
  const start = `${year}-01-01`
  const end = `${year}-12-31`
  const stmt = db.prepare(`
    SELECT match_id AS matchId, COUNT(*) AS count
    FROM assignments
    WHERE match_date BETWEEN ? AND ?
    GROUP BY match_id
  `)
  const rows = stmt.all(start, end) as Array<{ matchId: string; count: number }>
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.matchId, row.count)
  }
  return map
}

export function findConflicts(rows: AssignmentRow[]): Conflict[] {
  const groups = new Map<string, AssignmentRow[]>()
  for (const row of rows) {
    const key = `${row.courtId}__${row.matchTime}`
    const existing = groups.get(key)
    if (existing) {
      existing.push(row)
    } else {
      groups.set(key, [row])
    }
  }
  const conflicts: Conflict[] = []
  for (const group of groups.values()) {
    if (group.length > 1) {
      const first = group[0]!
      conflicts.push({
        courtId: first.courtId,
        matchTime: first.matchTime,
        matchIds: group.map((r) => r.matchId),
      })
    }
  }
  return conflicts
}
