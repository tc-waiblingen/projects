'use client'

import clsx from 'clsx'
import { groupColor } from '@/lib/plan-helpers'
import type { DispoAssignment, DispoMatch } from './types'

interface SidebarProps {
  matches: DispoMatch[]
  assignments: DispoAssignment[]
  selectedId: string | null
  recentChangeMatchIds: Set<string>
  onSelectMatch: (id: string) => void
  onClearSelection: () => void
  onDragStartMatch: (e: React.DragEvent, matchId: string) => void
  onDragEndMatch: () => void
  onResetAssignments: () => void
}

export function Sidebar({
  matches,
  assignments,
  selectedId,
  recentChangeMatchIds,
  onSelectMatch,
  onClearSelection,
  onDragStartMatch,
  onDragEndMatch,
  onResetAssignments,
}: SidebarProps) {
  const assignmentByMatchId = new Map(assignments.map((a) => [a.matchId, a]))

  return (
    <aside className="sidebar">
      <div className="match-list">
        {matches.map((m) => {
          const isSelected = selectedId === m.id
          return (
            <MatchCard
              key={m.id}
              match={m}
              assignment={assignmentByMatchId.get(m.id)}
              selected={isSelected}
              changed={recentChangeMatchIds.has(m.id)}
              onClick={() => (isSelected ? onClearSelection() : onSelectMatch(m.id))}
              onClearSelection={onClearSelection}
              onDragStart={(e) => onDragStartMatch(e, m.id)}
              onDragEnd={onDragEndMatch}
            />
          )
        })}
      </div>

      <div className="sidebar-foot">
        <button className="btn btn-text cursor-pointer" onClick={onResetAssignments}>
          Alle Zuordnungen zurücksetzen
        </button>
      </div>
    </aside>
  )
}

interface MatchCardProps {
  match: DispoMatch
  assignment?: DispoAssignment
  selected: boolean
  changed: boolean
  onClick: () => void
  onClearSelection: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function MatchCard({ match, assignment, selected, changed, onClick, onClearSelection, onDragStart, onDragEnd }: MatchCardProps) {
  const gc = groupColor(match.group || match.league || '')
  const under = assignment ? assignment.courtIds.length < match.minCourts : false
  const groupLabel = match.group || match.leagueShort || match.league || ''
  return (
    <div
      className={clsx('match-card', selected && 'is-selected', assignment && 'is-assigned')}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="match-card-stripe" style={{ background: gc.bg }} />
      {selected && (
        <button
          type="button"
          className="match-card-close"
          aria-label="Auswahl aufheben"
          title="Auswahl aufheben"
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onClearSelection()
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className="match-card-body">
        <div className="match-card-group">
          <span>{groupLabel}</span>
          {changed && <span className="change-badge">Geändert</span>}
        </div>
        <div className="match-card-teams">
          <span className="home">{match.homeTeamShort ?? match.homeTeam}</span>
          <span className="vs">vs.</span>
          <span className="away">{match.opponent}</span>
        </div>
        <div className="match-card-meta">
          <span>{match.startTime} Uhr</span>
          <span className="dot">·</span>
          <span>
            {match.minCourts}–{match.maxCourts} Plätze
          </span>
          {assignment && (
            <>
              <span className="dot">·</span>
              <span className={clsx('courts-assigned', under && 'is-under')}>
                {assignment.courtIds.length} zugeteilt
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
