'use client'

import clsx from 'clsx'
import type { DispoCourt } from '@/lib/directus/courts'
import {
  defaultDurationForCourtType,
  endMinutes,
  formatTime,
  type PlanConflict,
} from '@/lib/plan-helpers'
import { CourtPicker } from './CourtPicker'
import type { DispoAssignment, DispoMatch } from './types'

interface DetailsPanelProps {
  courts: DispoCourt[]
  matches: DispoMatch[]
  assignments: DispoAssignment[]
  selectedId: string | null
  selectedCourtIds: number[]
  conflicts: PlanConflict[]
  onSelectedCourtsChange: (next: number[]) => void
  onUpdateAssignment: (matchId: string, patch: Partial<DispoAssignment>) => void
  onAssignSelected: (matchId: string) => void
  onUnassign: (matchId: string) => void
  onClearSelection: () => void
}

export function DetailsPanel({
  courts,
  matches,
  assignments,
  selectedId,
  selectedCourtIds,
  conflicts,
  onSelectedCourtsChange,
  onUpdateAssignment,
  onAssignSelected,
  onUnassign,
  onClearSelection,
}: DetailsPanelProps) {
  const match = selectedId ? matches.find((m) => m.id === selectedId) : null
  const assignment = match ? assignments.find((a) => a.matchId === match.id) : undefined

  if (!match) {
    return (
      <aside className="details-panel is-empty">
        <div className="details-empty">
          <div className="eyebrow">Auswahl</div>
          <h3>Kein Spiel ausgewählt</h3>
          <p>
            Wähle links ein Spiel oder klicke auf dem Plan bzw. in der Timeline. Du kannst Spiele
            auch direkt auf Plätze ziehen.
          </p>
          {selectedCourtIds.length > 0 && (
            <div className="selected-courts-preview">
              <div className="eyebrow">Ausgewählte Plätze</div>
              <div className="court-chips">
                {selectedCourtIds.map((id) => {
                  const c = courts.find((x) => x.id === id)
                  return (
                    <span key={id} className="court-chip">
                      {c?.name ?? id}
                    </span>
                  )
                })}
              </div>
              <button className="btn btn-text" onClick={() => onSelectedCourtsChange([])}>
                Auswahl leeren
              </button>
            </div>
          )}
        </div>
      </aside>
    )
  }

  const start = assignment ? assignment.startTime : match.startTime
  const courtIds = assignment ? assignment.courtIds : selectedCourtIds
  const firstCourt = courts.find((c) => c.id === courtIds[0])
  const defaultDuration = firstCourt ? defaultDurationForCourtType(firstCourt.type) : 5.5
  const duration = assignment ? assignment.durationH : defaultDuration
  const endMin = endMinutes(start, duration)
  const under = courtIds.length < match.minCourts
  const over = courtIds.length > match.maxCourts

  const myConflicts = conflicts.filter((c) => c.matchIds.includes(match.id))

  return (
    <aside className="details-panel">
      <div className="details-head">
        <div className="eyebrow">{match.group || match.leagueShort}</div>
        <h3 className="details-title">
          <span>{match.homeTeamShort ?? match.homeTeam}</span>
          <span className="vs-muted">vs.</span>
          <span>{match.opponent}</span>
        </h3>
        <button className="icon-btn close" onClick={onClearSelection} title="Schließen">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="details-section">
        <div className="field-row">
          <div className="field">
            <label>Start</label>
            <input
              type="time"
              value={start}
              disabled={!assignment}
              onChange={(e) => {
                if (assignment) onUpdateAssignment(match.id, { startTime: e.target.value })
              }}
            />
          </div>
          <div className="field">
            <label>Dauer</label>
            <div className="duration-control">
              <button
                className="btn-step"
                disabled={!assignment}
                onClick={() =>
                  assignment && onUpdateAssignment(match.id, { durationH: Math.max(1, duration - 0.5) })
                }
              >
                −
              </button>
              <span className="dur-value">{duration.toFixed(1)} h</span>
              <button
                className="btn-step"
                disabled={!assignment}
                onClick={() =>
                  assignment && onUpdateAssignment(match.id, { durationH: Math.min(10, duration + 0.5) })
                }
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div className="field-caption">Endet ca. {formatTime(endMin)} Uhr</div>
      </div>

      <div className="details-section">
        <div className="field-label-row">
          <label>
            Plätze <span className="min-max">({match.minCourts}–{match.maxCourts})</span>
          </label>
          <span className={clsx('count-badge', under ? 'is-under' : over ? 'is-over' : 'is-ok')}>
            {courtIds.length}
            {under && ' · zu wenig'}
            {over && ' · zu viel'}
          </span>
        </div>
        <CourtPicker
          courts={courts}
          value={courtIds}
          onChange={(next) => {
            if (assignment) onUpdateAssignment(match.id, { courtIds: next })
            else onSelectedCourtsChange(next)
          }}
        />
        <div className="field-caption">
          Klicke auf Plätze im Plan oder in der Timeline, um zuzuteilen.
        </div>
      </div>

      {myConflicts.length > 0 && (
        <div className="details-section conflicts">
          <div className="eyebrow">Konflikte</div>
          {myConflicts.map((c, i) => {
            const court = courts.find((x) => x.id === c.courtId)
            return (
              <div key={i} className="conflict-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
                <span>Platz {court?.name ?? c.courtId}: Doppelbuchung.</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="details-actions">
        {!assignment ? (
          <button
            className="btn btn-primary"
            disabled={selectedCourtIds.length === 0}
            onClick={() => onAssignSelected(match.id)}
          >
            Auf {selectedCourtIds.length} {selectedCourtIds.length === 1 ? 'Platz' : 'Plätze'} zuteilen
          </button>
        ) : (
          <button className="btn btn-danger-ghost" onClick={() => onUnassign(match.id)}>
            Zuteilung aufheben
          </button>
        )}
      </div>
    </aside>
  )
}
