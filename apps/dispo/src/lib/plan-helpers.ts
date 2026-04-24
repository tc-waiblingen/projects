// Time math, group colors, conflict detection — TS port of the design's helpers.js.
// Time is represented as minutes-from-midnight (e.g. 09:00 = 540).

export const DAY_START = 7 * 60 // 07:00
export const DAY_END = 24 * 60 // 24:00 (midnight, end of day)

export const DEFAULT_DURATION_INDOOR_H = 5
export const DEFAULT_DURATION_OUTDOOR_H = 5.5

export function defaultDurationForCourtType(type: 'tennis_indoor' | 'tennis_outdoor'): number {
  return type === 'tennis_indoor' ? DEFAULT_DURATION_INDOOR_H : DEFAULT_DURATION_OUTDOOR_H
}

export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function formatTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function endMinutes(startHHMM: string, durationH: number): number {
  return parseTime(startHHMM) + Math.round(durationH * 60)
}

export function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function snapTo30(m: number): number {
  return Math.round(m / 30) * 30
}

export interface PlanAssignment {
  matchId: string
  courtIds: number[]
  startTime: string
  durationH: number
}

export interface OccupancyEntry {
  kind: 'match'
  matchId: string
  group: string
}

export function computeOccupancy(
  assignments: PlanAssignment[],
  matchGroupById: Map<string, string>,
  cursorMinutes: number,
): Map<number, OccupancyEntry> {
  const occ = new Map<number, OccupancyEntry>()
  for (const a of assignments) {
    const s = parseTime(a.startTime)
    const e = endMinutes(a.startTime, a.durationH)
    if (cursorMinutes < s || cursorMinutes >= e) continue
    const group = matchGroupById.get(a.matchId) ?? ''
    for (const c of a.courtIds) {
      occ.set(c, { kind: 'match', matchId: a.matchId, group })
    }
  }
  return occ
}

export interface PlanConflict {
  courtId: number
  matchIds: [string, string]
}

export function detectConflicts(assignments: PlanAssignment[]): PlanConflict[] {
  const byCourt = new Map<
    number,
    Array<{ matchId: string; start: number; end: number }>
  >()
  for (const a of assignments) {
    const start = parseTime(a.startTime)
    const end = endMinutes(a.startTime, a.durationH)
    for (const c of a.courtIds) {
      const list = byCourt.get(c)
      if (list) list.push({ matchId: a.matchId, start, end })
      else byCourt.set(c, [{ matchId: a.matchId, start, end }])
    }
  }
  const conflicts: PlanConflict[] = []
  for (const [courtId, list] of byCourt) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const ai = list[i]!
        const bj = list[j]!
        if (overlap(ai.start, ai.end, bj.start, bj.end)) {
          conflicts.push({ courtId, matchIds: [ai.matchId, bj.matchId] })
        }
      }
    }
  }
  return conflicts
}

// Stable color per match group.
const GROUP_PALETTE = [
  { bg: 'oklch(58.41% 0.194 30.14)', fg: '#fff' }, // tcw-red-500
  { bg: 'oklch(40.94% 0.164 30.14)', fg: '#fff' }, // tcw-red-700
  { bg: 'oklch(30.26% 0.121 30.07)', fg: '#fff' }, // tcw-red-800
  { bg: 'oklch(37.64% 0.077 90.40)', fg: '#fff' }, // accent-800
  { bg: 'oklch(56.35% 0.070 90.56)', fg: '#fff' }, // accent-700
  { bg: 'oklch(50.95% 0.203 30.16)', fg: '#fff' }, // tcw-red-600
  { bg: 'oklch(43.80% 0.017 39.30)', fg: '#fff' }, // taupe-600
  { bg: 'oklch(36.70% 0.016 35.70)', fg: '#fff' }, // taupe-700
]

export function groupColor(groupName: string): { bg: string; fg: string } {
  const name = groupName || ''
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return GROUP_PALETTE[hash % GROUP_PALETTE.length]!
}

// Abbreviate a group name for tight labels: "Herren Verbandsliga" -> "H".
const GROUP_ABBR: Array<[string, string]> = [
  ['Herren 50', 'H50'],
  ['Herren 30', 'H30'],
  ['Junioren U18', 'U18'],
  ['Juniorinnen U18', 'U18'],
  ['Junioren U15', 'U15'],
  ['Juniorinnen U15', 'U15'],
  ['Junioren U12', 'U12'],
  ['Juniorinnen U12', 'U12'],
  ['Herren', 'H'],
  ['Damen', 'D'],
]

export function abbreviateGroup(group: string): string {
  for (const [prefix, abbr] of GROUP_ABBR) {
    if (group.startsWith(prefix)) return abbr
  }
  return group.split(' ')[0]?.slice(0, 4) ?? ''
}

// Abbreviate a team label including its index suffix:
// "Herren 1" -> "H-1", "Junioren U15 1" -> "U15-1", "Herren 40 (2)" -> "H40-2".
// Falls back to `abbreviateGroup(group)` when no index is present.
export function abbreviateTeam(teamLabel: string | null | undefined, group: string): string {
  const base = abbreviateGroup(group || teamLabel || '')
  if (!teamLabel) return base
  const m = teamLabel.match(/(?:\(\s*(\d+)\s*\)|\s(\d+))\s*$/)
  const idx = m?.[1] ?? m?.[2]
  return idx ? `${base}-${idx}` : base
}
