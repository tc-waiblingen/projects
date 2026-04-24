'use client'

import { dateKey as formatDateKey } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DatePickerPopover } from './DatePickerPopover'

export type DayStatus = 'complete' | 'incomplete'

interface DayNavigatorProps {
  dateKey: string
  formattedDate: string
  homeMatchDateKeys: string[]
  statusByKey: Record<string, DayStatus>
}

export function DayNavigator({ dateKey, formattedDate, homeMatchDateKeys, statusByKey }: DayNavigatorProps) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const prev = [...homeMatchDateKeys].reverse().find((k) => k < dateKey) ?? null
  const next = homeMatchDateKeys.find((k) => k > dateKey) ?? null

  const todayKey = useMemo(() => formatDateKey(new Date()), [])

  const closePicker = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (popoverRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const navButton =
    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-tcw-accent-100 hover:text-body disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted dark:hover:bg-tcw-accent-800'

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        aria-label="Vorheriger Heimspieltag"
        title={prev ? 'Vorheriger Heimspieltag' : 'Kein vorheriger Heimspieltag'}
        disabled={!prev}
        onClick={() => prev && router.push(`/day/${prev}`)}
        className={navButton}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Datum wählen"
        className="group flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-2xl font-bold text-body transition-colors hover:bg-tcw-accent-100 dark:hover:bg-tcw-accent-800"
      >
        <span className="leading-none">{formattedDate}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-muted transition-colors group-hover:text-body"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Nächster Heimspieltag"
        title={next ? 'Nächster Heimspieltag' : 'Kein nächster Heimspieltag'}
        disabled={!next}
        onClick={() => next && router.push(`/day/${next}`)}
        className={navButton}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && (
        <DatePickerPopover
          selectedKey={dateKey}
          statusByKey={statusByKey}
          todayKey={todayKey}
          onSelect={(key) => {
            setOpen(false)
            if (key !== dateKey) router.push(`/day/${key}`)
            else triggerRef.current?.focus()
          }}
          onClose={closePicker}
          popoverRef={popoverRef}
        />
      )}
    </div>
  )
}
