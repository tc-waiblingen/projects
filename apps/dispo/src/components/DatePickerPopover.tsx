'use client'

import { dateKey, parseIsoDate } from '@/lib/format'
import clsx from 'clsx'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

type DayStatus = 'complete' | 'incomplete'

interface DatePickerPopoverProps {
  selectedKey: string
  statusByKey: Record<string, DayStatus>
  todayKey: string
  onSelect: (key: string) => void
  onClose: () => void
  popoverRef: RefObject<HTMLDivElement | null>
}

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTH_LABEL_FMT = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const DAY_LABEL_FMT = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function startOfWeek(date: Date): Date {
  return addDays(date, -weekdayIndex(date))
}

function endOfWeek(date: Date): Date {
  return addDays(date, 6 - weekdayIndex(date))
}

export function DatePickerPopover({
  selectedKey,
  statusByKey,
  todayKey,
  onSelect,
  onClose,
  popoverRef,
}: DatePickerPopoverProps) {
  const anchorDate = parseIsoDate(selectedKey) ?? new Date()
  const [viewMonth, setViewMonth] = useState(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1))
  const [focusedKey, setFocusedKey] = useState(selectedKey)
  const gridRef = useRef<HTMLDivElement>(null)
  const headingId = useId()

  const gridDays = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const start = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [viewMonth])

  const moveFocus = useCallback(
    (nextDate: Date) => {
      const key = dateKey(nextDate)
      setFocusedKey(key)
      if (nextDate.getMonth() !== viewMonth.getMonth() || nextDate.getFullYear() !== viewMonth.getFullYear()) {
        setViewMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
      }
    },
    [viewMonth],
  )

  const handleGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = parseIsoDate(focusedKey) ?? anchorDate
    let next: Date | null = null
    switch (e.key) {
      case 'ArrowLeft':
        next = addDays(current, -1)
        break
      case 'ArrowRight':
        next = addDays(current, 1)
        break
      case 'ArrowUp':
        next = addDays(current, -7)
        break
      case 'ArrowDown':
        next = addDays(current, 7)
        break
      case 'Home':
        next = startOfWeek(current)
        break
      case 'End':
        next = endOfWeek(current)
        break
      case 'PageUp':
        next = e.shiftKey ? addMonths(current, -12) : addMonths(current, -1)
        break
      case 'PageDown':
        next = e.shiftKey ? addMonths(current, 12) : addMonths(current, 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect(focusedKey)
        return
      default:
        return
    }
    e.preventDefault()
    moveFocus(next)
  }

  useEffect(() => {
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-key="${focusedKey}"]`)
    el?.focus()
  }, [focusedKey, viewMonth])

  useEffect(() => {
    const container = popoverRef.current
    if (!container) return
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex="0"]',
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    container.addEventListener('keydown', handleKey)
    return () => container.removeEventListener('keydown', handleKey)
  }, [onClose, popoverRef])

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="absolute top-full left-0 z-50 mt-2 w-72 rounded-md border border-tcw-accent-200 bg-white p-3 shadow-lg dark:border-tcw-accent-800 dark:bg-tcw-accent-900"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Vorheriger Monat"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-tcw-accent-100 hover:text-body dark:hover:bg-tcw-accent-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div
          id={headingId}
          aria-live="polite"
          className="text-sm font-semibold text-body capitalize"
        >
          {MONTH_LABEL_FMT.format(viewMonth)}
        </div>
        <button
          type="button"
          aria-label="Nächster Monat"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-tcw-accent-100 hover:text-body dark:hover:bg-tcw-accent-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-labelledby={headingId}
        onKeyDown={handleGridKeyDown}
        className="grid grid-cols-7 gap-0.5 text-center"
      >
        <div role="row" className="contents">
          {WEEKDAY_HEADERS.map((w) => (
            <div
              key={w}
              role="columnheader"
              className="pb-1 text-xs font-semibold text-muted"
            >
              {w}
            </div>
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} role="row" className="contents">
            {gridDays.slice(row * 7, row * 7 + 7).map((day) => {
              const key = dateKey(day)
              const inMonth = day.getMonth() === viewMonth.getMonth()
              const isSelected = key === selectedKey
              const isToday = key === todayKey
              const isFocused = key === focusedKey
              const status = statusByKey[key]
              return (
                <div role="gridcell" aria-selected={isSelected} key={key}>
                  <button
                    type="button"
                    data-key={key}
                    tabIndex={isFocused ? 0 : -1}
                    aria-label={DAY_LABEL_FMT.format(day)}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => onSelect(key)}
                    className={clsx(
                      'relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tcw-red-500',
                      !inMonth && 'text-muted opacity-40',
                      inMonth && !isSelected && 'text-body hover:bg-tcw-accent-100 dark:hover:bg-tcw-accent-800',
                      isSelected && 'bg-tcw-red-500 text-white hover:bg-tcw-red-600',
                      isToday && !isSelected && 'ring-1 ring-tcw-red-500',
                    )}
                  >
                    {day.getDate()}
                    {status && !isSelected && (
                      <span
                        className={clsx(
                          'absolute bottom-1 h-1 w-1 rounded-full',
                          status === 'complete' ? 'bg-green-600' : 'bg-tcw-red-500',
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
