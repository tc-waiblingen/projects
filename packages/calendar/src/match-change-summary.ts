import type { NrMatch, NrMatchChange, NrTeam } from './nr-client'

export type MatchChangeKind =
  | 'created'
  | 'rescheduled-date'
  | 'rescheduled-time'
  | 'relocated'

export interface MatchChangeSummaryEntry {
  kind: MatchChangeKind
  changedAt: string
  matchId: string
  teamId: string
  teamLabel: string
  oldValue?: string | null
  newValue?: string | null
  matchDate?: string
  matchTime?: string
  opponent?: string
}

export interface MatchChangeSummaryGroup {
  dateKey: string
  entries: MatchChangeSummaryEntry[]
}

export interface BuildMatchChangeSummaryOptions {
  changes: NrMatchChange[]
  matches: NrMatch[]
  teams: NrTeam[]
  formatTeamLabel?: (team: NrTeam) => string
}

const FIELD_TO_KIND: Record<string, MatchChangeKind> = {
  __created: 'created',
  match_date: 'rescheduled-date',
  match_time: 'rescheduled-time',
  location: 'relocated',
}

function localDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function buildMatchChangeSummary(
  options: BuildMatchChangeSummaryOptions,
): MatchChangeSummaryGroup[] {
  const { changes, matches, teams, formatTeamLabel } = options

  const matchById = new Map<string, NrMatch>()
  for (const m of matches) matchById.set(m.id, m)
  const teamById = new Map<string, NrTeam>()
  for (const t of teams) teamById.set(t.id, t)

  const bucketKey = (c: NrMatchChange) =>
    `${c.matchId}\u0000${c.field}\u0000${localDateKey(c.changedAt)}`
  const buckets = new Map<string, NrMatchChange[]>()

  for (const change of changes) {
    if (!(change.field in FIELD_TO_KIND)) continue
    if (!matchById.has(change.matchId)) continue
    const key = bucketKey(change)
    const existing = buckets.get(key)
    if (existing) existing.push(change)
    else buckets.set(key, [change])
  }

  const entries: MatchChangeSummaryEntry[] = []
  for (const group of buckets.values()) {
    group.sort((a, b) => a.changedAt.localeCompare(b.changedAt))
    const oldest = group[0]!
    const newest = group[group.length - 1]!
    const match = matchById.get(newest.matchId)!
    const team = teamById.get(newest.teamId)
    const teamLabel = team
      ? (formatTeamLabel ? formatTeamLabel(team) : team.name)
      : newest.teamId
    const opponent = match.isHome ? match.awayTeam : match.homeTeam
    entries.push({
      kind: FIELD_TO_KIND[newest.field]!,
      changedAt: newest.changedAt,
      matchId: newest.matchId,
      teamId: newest.teamId,
      teamLabel,
      oldValue: oldest.oldValue,
      newValue: newest.newValue,
      matchDate: match.matchDate,
      matchTime: match.matchTime,
      opponent,
    })
  }

  const byDate = new Map<string, MatchChangeSummaryEntry[]>()
  for (const entry of entries) {
    const dateKey = localDateKey(entry.changedAt)
    const list = byDate.get(dateKey)
    if (list) list.push(entry)
    else byDate.set(dateKey, [entry])
  }

  const groups: MatchChangeSummaryGroup[] = []
  for (const [dateKey, list] of byDate.entries()) {
    list.sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    groups.push({ dateKey, entries: list })
  }
  groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  return groups
}
