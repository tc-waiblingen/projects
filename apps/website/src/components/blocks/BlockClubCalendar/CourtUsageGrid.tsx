'use client'

import type { CourtUsageMonth, CourtUsageDay } from '@tcw/calendar'

interface CourtUsageGridProps {
  months: CourtUsageMonth[]
  mode: 'courts' | 'teams'
  onMonthClick: (monthKey: string) => void
  onDayClick: (dateKey: string) => void
}

const HEAT_COLORS = {
  low: 'bg-green-900/80 text-green-200',
  medium: 'bg-amber-900/80 text-amber-200',
  high: 'bg-red-900/80 text-red-200',
} as const

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function formatCourtTypeLabel(courtType: 'tennis_indoor' | 'tennis_outdoor'): string {
  return courtType === 'tennis_indoor' ? 'Halle' : 'Freiplätze'
}

function getSuperscript(day: CourtUsageDay, mode: 'courts' | 'teams'): string {
  if (day.tournament) return 'T'
  const am = mode === 'courts' ? day.am.courts : day.am.teams
  const pm = mode === 'courts' ? day.pm.courts : day.pm.teams
  return `${am}+${pm}`
}

function MonthGrid({ month, mode, onMonthClick, onDayClick }: {
  month: CourtUsageMonth
  mode: 'courts' | 'teams'
  onMonthClick: (monthKey: string) => void
  onDayClick: (dateKey: string) => void
}) {
  const year = month.monthDate.getFullYear()
  const monthIndex = month.monthDate.getMonth()
  const daysInMonth = getDaysInMonth(year, monthIndex)
  const firstDayOffset = getWeekdayIndex(new Date(year, monthIndex, 1))

  const dayLookup = new Map(month.days.map((d) => [d.dateKey, d]))

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

  return (
    <div className="min-w-[240px]">
      <button
        type="button"
        onClick={() => onMonthClick(month.monthKey)}
        className="mb-2 w-full cursor-pointer text-left font-bold text-body hover:underline"
      >
        {formatMonthLabel(month.monthDate)}{' '}
        <span className="text-xs font-normal text-muted">
          ({formatCourtTypeLabel(month.courtType)})
        </span>
      </button>
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr>
            {WEEKDAY_HEADERS.map((h) => (
              <th key={h} className="p-1 text-center text-xs text-muted font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((dayNum, ci) => {
                if (dayNum === null) return <td key={ci} className="p-1" />

                const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const usageDay = dayLookup.get(dateKey)

                if (!usageDay) {
                  return <td key={ci} className="p-1 text-center text-muted">{dayNum}</td>
                }

                return (
                  <td key={ci} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDayClick(dateKey)}
                      className="relative inline-block cursor-pointer"
                    >
                      <span className={`inline-block min-w-[26px] rounded-md px-1 py-0.5 text-center text-sm font-medium ${HEAT_COLORS[usageDay.heatLevel]}`}>
                        {dayNum}
                      </span>
                      <span className="absolute -right-3 -top-2 text-[10px] font-bold text-body">
                        {getSuperscript(usageDay, mode)}
                      </span>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CourtUsageGrid({ months, mode, onMonthClick, onDayClick }: CourtUsageGridProps) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => (
        <MonthGrid
          key={month.monthKey}
          month={month}
          mode={mode}
          onMonthClick={onMonthClick}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  )
}
