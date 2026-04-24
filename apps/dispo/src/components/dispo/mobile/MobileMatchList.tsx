'use client'

import clsx from 'clsx'
import { groupColor } from '@/lib/plan-helpers'
import type { DispoAssignment, DispoMatch } from '../types'

interface MobileMatchListProps {
  matches: DispoMatch[]
  assignments: DispoAssignment[]
  selectedId: string | null
  recentChangeIds: Set<string>
  onSelectMatch: (id: string) => void
  onResetAssignments: () => void
}

export function MobileMatchList({
  matches,
  assignments,
  selectedId,
  recentChangeIds,
  onSelectMatch,
  onResetAssignments,
}: MobileMatchListProps) {
  const byId = new Map(assignments.map((a) => [a.matchId, a]))
  return (
    <div className="mobile-match-list">
      {matches.length === 0 ? (
        <div className="empty-hint">Keine Heimspiele.</div>
      ) : (
        matches.map((m) => {
          const a = byId.get(m.id)
          const gc = groupColor(m.group || m.league || '')
          const selected = selectedId === m.id
          const assigned = a?.courtIds.length ?? 0
          const under = !!a && assigned < m.minCourts
          const changed = recentChangeIds.has(m.id)
          return (
            <button
              key={m.id}
              type="button"
              className={clsx('match-card', selected && 'is-selected', a && 'is-assigned')}
              onClick={() => onSelectMatch(m.id)}
            >
              <span className="match-card-stripe" style={{ background: gc.bg }} />
              <span className="match-card-body">
                <span className="match-card-group">
                  <span>{m.group || m.leagueShort || m.league || ''}</span>
                  {changed && <span className="change-badge">Geändert</span>}
                </span>
                <span className="match-card-teams">
                  <span className="home">{m.homeTeamShort ?? m.homeTeam}</span>
                  <span className="vs">vs.</span>
                  <span className="away">{m.opponent}</span>
                </span>
                <span className="match-card-meta">
                  <span>{m.startTime} Uhr</span>
                  <span className="dot">·</span>
                  <span>{m.minCourts}–{m.maxCourts} Plätze</span>
                  {a && (
                    <>
                      <span className="dot">·</span>
                      <span className={clsx('courts-assigned', under && 'is-under')}>
                        {assigned} zugeteilt
                      </span>
                    </>
                  )}
                </span>
              </span>
            </button>
          )
        })
      )}
      <button
        type="button"
        className="btn btn-text mobile-reset"
        onClick={onResetAssignments}
      >
        Alle Zuordnungen zurücksetzen
      </button>
    </div>
  )
}
