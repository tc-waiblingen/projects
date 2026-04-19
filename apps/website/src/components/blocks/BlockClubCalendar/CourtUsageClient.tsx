'use client'

import { useState, useMemo, useCallback } from 'react'
import type { CalendarEvent, CourtUsageDay } from '@tcw/calendar'
import { computeCourtUsage } from '@tcw/calendar'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { CourtUsageGrid } from './CourtUsageGrid'
import { CourtUsageDayDetail } from './CourtUsageDayDetail'
import { CourtUsagePrintTable } from './CourtUsagePrintTable'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  serverNow: number
  matchesLastRefreshedAt: string | null
}

export function CourtUsageClient({ events, indoorCourtCount, outdoorCourtCount, matchesLastRefreshedAt }: CourtUsageClientProps) {
  const [mode, setMode] = useState<'courts' | 'teams'>('courts')
  const [dialogDay, setDialogDay] = useState<CourtUsageDay | null>(null)

  const months = useMemo(
    () => computeCourtUsage({ events, indoorCourtCount, outdoorCourtCount, year: new Date().getFullYear() }),
    [events, indoorCourtCount, outdoorCourtCount],
  )

  const openDayDialog = useCallback((dateKey: string) => {
    const monthKey = dateKey.substring(0, 7)
    const month = months.find((m) => m.monthKey === monthKey)
    const day = month?.days.find((d) => d.dateKey === dateKey)
    if (day) setDialogDay(day)
  }, [months])

  return (
    <div>
      {matchesLastRefreshedAt && (
        <div className="mb-3 text-xs text-muted">Stand: {matchesLastRefreshedAt}</div>
      )}
      {/* Toggle + Print — visible on screen only */}
      <div className="mb-6 flex items-center gap-4 print:hidden">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setMode('courts')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${mode === 'courts' ? 'bg-white font-medium text-body shadow-sm dark:bg-gray-700' : 'text-muted'}`}
          >
            Platzbelegung
          </button>
          <button
            type="button"
            onClick={() => setMode('teams')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${mode === 'teams' ? 'bg-white font-medium text-body shadow-sm dark:bg-gray-700' : 'text-muted'}`}
          >
            Heimmannschaften
          </button>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="cursor-pointer rounded-md border border-gray-200 px-3 py-1.5 text-sm text-muted hover:text-body dark:border-gray-700"
        >
          Drucken
        </button>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted print:hidden">
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-green-900/80" /> Niedrig</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-amber-900/80" /> Mittel</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded bg-red-900/80" /> Hoch / Turnier</span>
        <span className="text-muted">
          {mode === 'courts' ? 'vorm.+nachm. Plätze' : 'vorm.+nachm. Mannschaften'} | <strong>T</strong> = Turnier
        </span>
      </div>

      {/* Grid — hidden in print */}
      <div className="print:hidden">
        <CourtUsageGrid
          months={months}
          mode={mode}
          onDayClick={openDayDialog}
        />
      </div>

      {/* Day detail dialog */}
      <Dialog open={dialogDay !== null} onClose={() => setDialogDay(null)} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/50 transition-opacity duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
          <DialogPanel
            transition
            className="w-full max-h-[90vh] max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl transition-all duration-200 ease-out data-[closed]:translate-y-full data-[closed]:opacity-0 sm:rounded-2xl sm:data-[closed]:translate-y-4 dark:bg-tcw-accent-900"
          >
            <DialogTitle className="mb-4 flex items-center justify-end">
              <button
                onClick={() => setDialogDay(null)}
                className="cursor-pointer rounded p-1 text-tcw-accent-500 hover:bg-tcw-accent-100 dark:text-tcw-accent-400 dark:hover:bg-tcw-accent-800"
                aria-label="Schließen"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </DialogTitle>
            {dialogDay && <CourtUsageDayDetail day={dialogDay} />}
          </DialogPanel>
        </div>
      </Dialog>

      {/* Print view — hidden on screen, shown in print */}
      <CourtUsagePrintTable months={months} />
    </div>
  )
}
