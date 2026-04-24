'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Issue } from '../types'
import { formatTime } from '@/lib/plan-helpers'

interface MobileTopBarProps {
  date: string
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
  issues: Issue[]
  onIssueSelect: (matchId: string) => void
  saving: boolean
  saveError: string | null
  savedAt: number | null
}

export function MobileTopBar({
  date,
  prevDateKey,
  nextDateKey,
  formattedDate,
  issues,
  onIssueSelect,
  saving,
  saveError,
  savedAt,
}: MobileTopBarProps) {
  const router = useRouter()
  const [issuesOpen, setIssuesOpen] = useState(false)
  const issuesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!issuesOpen) return
    function onDocClick(e: MouseEvent) {
      if (!issuesRef.current) return
      if (!issuesRef.current.contains(e.target as Node)) setIssuesOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIssuesOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [issuesOpen])

  const issueCount = issues.length
  const hasIssues = issueCount > 0

  return (
    <header className="mobile-topbar">
      <button
        type="button"
        className="mobile-chevron"
        aria-label="Vorheriger Spieltag"
        disabled={!prevDateKey}
        onClick={() => prevDateKey && router.push(`/day/${prevDateKey}`)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="mobile-date">{formattedDate}</div>

      <button
        type="button"
        className="mobile-chevron"
        aria-label="Nächster Spieltag"
        disabled={!nextDateKey}
        onClick={() => nextDateKey && router.push(`/day/${nextDateKey}`)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <div className="mobile-topbar-spacer" />

      <div className="issues-wrap" ref={issuesRef}>
        <button
          type="button"
          className={clsx('issues-badge', hasIssues ? 'has-issues' : 'all-good', issuesOpen && 'is-open')}
          aria-expanded={issuesOpen}
          disabled={!hasIssues}
          onClick={() => setIssuesOpen((v) => !v)}
        >
          {hasIssues ? `${issueCount}` : '✓'}
        </button>
        {issuesOpen && (
          <div className="issues-dropdown" role="menu">
            {issues.map((iss) => (
              <button
                key={iss.key}
                type="button"
                role="menuitem"
                className="issues-dropdown-item"
                onClick={() => {
                  onIssueSelect(iss.matchId)
                  setIssuesOpen(false)
                }}
              >
                <span className="issues-dropdown-title">{iss.title}</span>
                <span className="issues-dropdown-detail">{iss.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MobileSaveStatus saving={saving} saveError={saveError} savedAt={savedAt} />
    </header>
  )
}

function MobileSaveStatus({ saving, saveError, savedAt }: { saving: boolean; saveError: string | null; savedAt: number | null }) {
  if (saveError) {
    return (
      <span className="mobile-save-icon is-error" title={saveError} aria-label={`Fehler: ${saveError}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </span>
    )
  }
  if (saving) return <span className="mobile-save-icon is-saving" aria-label="Speichere" />
  if (savedAt) {
    const d = new Date(savedAt)
    const time = formatTime(d.getHours() * 60 + d.getMinutes())
    return (
      <span className="mobile-save-icon is-saved" aria-label={`Gespeichert ${time}`} title={`Gespeichert · ${time}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </span>
    )
  }
  return null
}
