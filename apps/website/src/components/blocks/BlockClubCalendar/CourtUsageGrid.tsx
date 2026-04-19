'use client'

import type { CourtUsageMonth, CourtUsageDay } from '@tcw/calendar'

interface CourtUsageGridProps {
  months: CourtUsageMonth[]
  mode: 'courts' | 'teams'
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

function getSuperscript(day: CourtUsageDay, mode: 'courts' | 'teams'): string {
  if (day.tournament) return 'T'
  const am = mode === 'courts' ? day.am.courts : day.am.teams
  const pm = mode === 'courts' ? day.pm.courts : day.pm.teams
  return `${am}+${pm}`
}

function MonthGrid({ month, mode, onDayClick }: {
  month: CourtUsageMonth
  mode: 'courts' | 'teams'
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
      <div className="mb-2 font-bold text-body">
        {formatMonthLabel(month.monthDate)}
      </div>
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

export function CourtUsageGrid({ months, mode, onDayClick }: CourtUsageGridProps) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => (
        <MonthGrid
          key={month.monthKey}
          month={month}
          mode={mode}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  )
}
