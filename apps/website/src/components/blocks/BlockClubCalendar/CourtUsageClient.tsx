'use client'

import { useState, useMemo } from 'react'
import type { CalendarEvent } from '@tcw/calendar'
import { computeCourtUsage } from '@tcw/calendar'
import { CourtUsageGrid } from './CourtUsageGrid'
import { CourtUsageMonthDetail } from './CourtUsageMonthDetail'
import { CourtUsageDayDetail } from './CourtUsageDayDetail'
import { CourtUsagePrintView } from './CourtUsagePrintView'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  serverNow: number
}

type View = { type: 'grid' } | { type: 'month'; monthKey: string } | { type: 'day'; monthKey: string; dateKey: string }

export function CourtUsageClient({ events, indoorCourtCount, outdoorCourtCount }: CourtUsageClientProps) {
  const [view, setView] = useState<View>({ type: 'grid' })
  const [mode, setMode] = useState<'courts' | 'teams'>('courts')

  const months = useMemo(
    () => computeCourtUsage({ events, indoorCourtCount, outdoorCourtCount }),
    [events, indoorCourtCount, outdoorCourtCount],
  )

  const selectedMonth = view.type !== 'grid'
    ? months.find((m) => m.monthKey === view.monthKey)
    : null

  const selectedDay = view.type === 'day' && selectedMonth
    ? selectedMonth.days.find((d) => d.dateKey === view.dateKey)
    : null

  return (
    <div>
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

      {/* Legend — grid view only */}
      {view.type === 'grid' && (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted print:hidden">
          <span><span className="mr-1 inline-block h-3 w-3 rounded bg-green-900/80" /> Niedrig</span>
          <span><span className="mr-1 inline-block h-3 w-3 rounded bg-amber-900/80" /> Mittel</span>
          <span><span className="mr-1 inline-block h-3 w-3 rounded bg-red-900/80" /> Hoch / Turnier</span>
          <span className="text-muted">
            {mode === 'courts' ? 'AM+PM Plätze' : 'AM+PM Mannschaften'} | <strong>T</strong> = Turnier
          </span>
        </div>
      )}

      {/* Interactive views — hidden in print */}
      <div className="print:hidden">
        {view.type === 'grid' && (
          <CourtUsageGrid
            months={months}
            mode={mode}
            onMonthClick={(monthKey) => setView({ type: 'month', monthKey })}
            onDayClick={(dateKey) => {
              const monthKey = dateKey.substring(0, 7)
              setView({ type: 'day', monthKey, dateKey })
            }}
          />
        )}

        {view.type === 'month' && selectedMonth && (
          <CourtUsageMonthDetail
            month={selectedMonth}
            onDayClick={(dateKey) => setView({ type: 'day', monthKey: view.monthKey, dateKey })}
            onBack={() => setView({ type: 'grid' })}
          />
        )}

        {view.type === 'day' && selectedDay && (
          <div>
            <button
              type="button"
              onClick={() => setView({ type: 'month', monthKey: view.monthKey })}
              className="mb-4 cursor-pointer text-sm text-muted hover:text-body hover:underline"
            >
              ← Zurück zum Monat
            </button>
            <CourtUsageDayDetail day={selectedDay} />
          </div>
        )}
      </div>

      {/* Print view — hidden on screen, shown in print */}
      <CourtUsagePrintView months={months} />
    </div>
  )
}
