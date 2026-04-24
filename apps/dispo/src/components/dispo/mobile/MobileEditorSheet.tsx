'use client'

import clsx from 'clsx'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { DispoCourt } from '@/lib/directus/courts'
import { CourtPicker } from '../CourtPicker'
import type { DispoAssignment, DispoMatch } from '../types'
import type { PlanConflict } from '@/lib/plan-helpers'

interface MobileEditorSheetProps {
  match: DispoMatch
  assignment: DispoAssignment | null
  courts: DispoCourt[]
  conflicts: PlanConflict[]
  onClose: () => void
  onToggleCourt: (courtId: number) => void
  onUpdateAssignment: (matchId: string, patch: Partial<DispoAssignment>) => void
  onRemoveCourt: (matchId: string, courtId: number) => void
}

export function MobileEditorSheet({
  match,
  assignment,
  courts,
  conflicts,
  onClose,
  onToggleCourt,
  onUpdateAssignment,
  onRemoveCourt,
}: MobileEditorSheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  const courtIds = assignment?.courtIds ?? []
  const assigned = courtIds.length
  const matchConflicts = conflicts.filter((c) => c.matchIds.includes(match.id))
  const groupLabel = match.group || match.leagueShort || match.league || ''

  const countClass = assigned < match.minCourts ? 'is-under' : assigned > match.maxCourts ? 'is-over' : 'is-ok'

  const setStartTime = (value: string) => {
    if (!assignment) return
    onUpdateAssignment(match.id, { startTime: value })
  }

  const adjustDuration = (delta: number) => {
    if (!assignment) return
    const next = Math.max(1, Math.min(12, Math.round((assignment.durationH + delta) * 2) / 2))
    onUpdateAssignment(match.id, { durationH: next })
  }

  return createPortal(
    <div className="mobile-sheet-layer" role="dialog" aria-modal="true" aria-label={`${match.homeTeamShort ?? match.homeTeam} gegen ${match.opponent}`}>
      <div className="mobile-sheet-backdrop" onClick={onClose} />
      <div className="mobile-sheet">
        <div className="mobile-sheet-grab" aria-hidden />
        <div className="mobile-sheet-head">
          <div className="mobile-sheet-eyebrow">{groupLabel}</div>
          <div className="mobile-sheet-title">
            <strong>{match.homeTeamShort ?? match.homeTeam}</strong>
            <span className="vs-muted">vs.</span>
            <span>{match.opponent}</span>
          </div>
          <button type="button" className="icon-btn mobile-sheet-close" aria-label="Schließen" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mobile-sheet-body">
          <div className="field-row">
            <div className="field">
              <label htmlFor={`time-${match.id}`}>Start</label>
              <input
                id={`time-${match.id}`}
                type="time"
                value={assignment?.startTime ?? match.startTime}
                disabled={!assignment}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Dauer</label>
              <div className="duration-control">
                <button type="button" className="btn-step" onClick={() => adjustDuration(-0.5)} disabled={!assignment}>−</button>
                <span className="dur-value">{assignment ? `${assignment.durationH.toFixed(1)} h` : '—'}</span>
                <button type="button" className="btn-step" onClick={() => adjustDuration(0.5)} disabled={!assignment}>+</button>
              </div>
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <label>Plätze <span className="min-max">({match.minCourts}–{match.maxCourts})</span></label>
              <span className={clsx('count-badge', countClass)}>{assigned}</span>
            </div>
            <CourtPicker
              courts={courts}
              value={courtIds}
              onChange={(next) => {
                const prev = new Set(courtIds)
                const now = new Set(next)
                for (const id of prev) if (!now.has(id)) onRemoveCourt(match.id, id)
                for (const id of now) if (!prev.has(id)) onToggleCourt(id)
              }}
            />
          </div>

          {matchConflicts.length > 0 && (
            <div className="field conflicts">
              <label>Konflikte</label>
              {matchConflicts.map((c) => (
                <div key={`${c.courtId}:${c.matchIds[0]}:${c.matchIds[1]}`} className="conflict-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  </svg>
                  Platz doppelt belegt
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
