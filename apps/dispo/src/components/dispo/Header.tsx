'use client'

import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { formatTime } from '@/lib/plan-helpers'
import type { DispoView, Issue } from './types'

interface HeaderProps {
  view: DispoView
  onViewChange: (v: DispoView) => void
  issues: Issue[]
  onIssueSelect: (matchId: string) => void
  saving: boolean
  saveError: string | null
  savedAt: number | null
}

const VIEW_OPTIONS: Array<{ id: DispoView; label: string; icon: React.ReactNode }> = [
  {
    id: 'vtimeline',
    label: 'Spalten',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v18M12 3v18M18 3v18" />
      </svg>
    ),
  },
  {
    id: 'map',
    label: 'Lageplan',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" />
        <path d="M9 3v15" />
        <path d="M15 6v15" />
      </svg>
    ),
  },
]

export function Header({ view, onViewChange, issues, onIssueSelect, saving, saveError, savedAt }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-status">
        <IssuesBadge issues={issues} onIssueSelect={onIssueSelect} />
        <SaveStatus saving={saving} saveError={saveError} savedAt={savedAt} />
      </div>
      <div className="view-switch">
        {VIEW_OPTIONS.map((v) => (
          <button key={v.id} className={clsx(view === v.id && 'is-active')} onClick={() => onViewChange(v.id)}>
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>
    </header>
  )
}

interface IssuesBadgeProps {
  issues: Issue[]
  onIssueSelect: (matchId: string) => void
}

function IssuesBadge({ issues, onIssueSelect }: IssuesBadgeProps) {
  const [openRaw, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = issues.length
  const hasIssues = count > 0
  const open = openRaw && hasIssues

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="issues-wrap" ref={ref}>
      <button
        type="button"
        className={clsx('issues-badge', hasIssues ? 'has-issues' : 'all-good', open && 'is-open')}
        aria-expanded={open}
        aria-haspopup="true"
        disabled={!hasIssues}
        onClick={() => setOpen((v) => !v)}
      >
        {hasIssues ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
            {count} {count === 1 ? 'Hinweis' : 'Hinweise'}
          </>
        ) : (
          'Alles stimmig'
        )}
      </button>
      {open && (
        <div className="issues-dropdown" role="menu">
          {issues.map((iss) => (
            <button
              key={iss.key}
              type="button"
              role="menuitem"
              className="issues-dropdown-item"
              onClick={() => {
                onIssueSelect(iss.matchId)
                setOpen(false)
              }}
            >
              <span className="issues-dropdown-title">{iss.title}</span>
              <span className="issues-dropdown-detail">{iss.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SaveStatusProps {
  saving: boolean
  saveError: string | null
  savedAt: number | null
}

function SaveStatus({ saving, saveError, savedAt }: SaveStatusProps) {
  if (saveError) {
    return (
      <span className="save-status is-error" title={saveError}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
        Fehler beim Speichern
      </span>
    )
  }
  if (saving) {
    return (
      <span className="save-status is-saving">
        <span className="save-status-spinner" />
        Speichere …
      </span>
    )
  }
  if (savedAt) {
    const d = new Date(savedAt)
    const time = formatTime(d.getHours() * 60 + d.getMinutes())
    return (
      <span className="save-status is-saved">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
        Gespeichert · {time}
      </span>
    )
  }
  return null
}
