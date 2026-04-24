'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DatePickerPopover } from '@/components/DatePickerPopover'
import type { DayStatus } from '@/components/DayNavigator'
import { dateKey as formatDateKey } from '@/lib/format'
import { formatTime } from '@/lib/plan-helpers'
import type { Issue } from '../types'

interface MobileTopBarProps {
  dateKey: string
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
  statusByKey: Record<string, DayStatus>
  issues: Issue[]
  onIssueSelect: (matchId: string) => void
  saving: boolean
  saveError: string | null
  savedAt: number | null
  hasPendingRemote: boolean
  onApplyPendingRemote: () => void
}

export function MobileTopBar({
  dateKey,
  prevDateKey,
  nextDateKey,
  formattedDate,
  statusByKey,
  issues,
  onIssueSelect,
  saving,
  saveError,
  savedAt,
  hasPendingRemote,
  onApplyPendingRemote,
}: MobileTopBarProps) {
  const router = useRouter()
  const [issuesOpen, setIssuesOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const issuesRef = useRef<HTMLDivElement>(null)
  const pickerTriggerRef = useRef<HTMLButtonElement>(null)
  const pickerPopoverRef = useRef<HTMLDivElement>(null)

  const todayKey = useMemo(() => formatDateKey(new Date()), [])

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

  useEffect(() => {
    if (!pickerOpen) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (pickerPopoverRef.current?.contains(target)) return
      if (pickerTriggerRef.current?.contains(target)) return
      setPickerOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [pickerOpen])

  const closePicker = () => {
    setPickerOpen(false)
    pickerTriggerRef.current?.focus()
  }

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

      <div className="mobile-date-wrap">
        <button
          ref={pickerTriggerRef}
          type="button"
          className="mobile-date"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
          title="Datum wählen"
        >
          {formattedDate}
        </button>
        {pickerOpen && (
          <DatePickerPopover
            selectedKey={dateKey}
            statusByKey={statusByKey}
            todayKey={todayKey}
            onSelect={(key) => {
              setPickerOpen(false)
              if (key !== dateKey) router.push(`/day/${key}`)
              else pickerTriggerRef.current?.focus()
            }}
            onClose={closePicker}
            popoverRef={pickerPopoverRef}
          />
        )}
      </div>

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

      {hasPendingRemote && (
        <button
          type="button"
          className="pending-remote-pill"
          onClick={onApplyPendingRemote}
          title="Änderungen eines anderen Operators übernehmen"
        >
          Aktualisierung
        </button>
      )}
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
