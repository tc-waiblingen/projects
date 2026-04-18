'use client'

import type { CourtUsageDay, CourtUsageMonth } from '@tcw/calendar'
import type { AssignmentStatus } from '@/lib/assignment-status'

interface CourtUsageGridProps {
  months: CourtUsageMonth[]
  onDayClick: (dateKey: string) => void
  neutral?: boolean
  statusByDate?: Map<string, AssignmentStatus>
}

const USAGE_BG = {
  low: 'bg-green-900/80',
  medium: 'bg-amber-900/80',
  high: 'bg-red-900/80',
} as const

const USAGE_TEXT = {
  low: 'text-green-200',
  medium: 'text-amber-200',
  high: 'text-red-200',
} as const

const USAGE_CSS: Record<keyof typeof USAGE_BG, string> = {
  low: 'rgb(20 83 45 / 0.8)',
  medium: 'rgb(120 53 15 / 0.8)',
  high: 'rgb(127 29 29 / 0.8)',
}

const STATUS_CSS: Record<AssignmentStatus, string> = {
  none: 'rgb(127 29 29 / 0.85)',
  partial: 'rgb(194 65 12 / 0.9)',
  exact: 'rgb(22 101 52 / 0.9)',
  over: 'rgb(16 185 129 / 0.75)',
}

const NEUTRAL_BG = 'bg-tcw-accent-800/60'
const NEUTRAL_TEXT = 'text-tcw-accent-200 dark:text-tcw-accent-100'

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

function getSuperscript(day: CourtUsageDay): string {
  if (day.tournament) return 'T'
  return `${day.am.courts}+${day.pm.courts}`
}

function DayPill({
  dayNum,
  usageDay,
  status,
  neutral,
}: {
  dayNum: number
  usageDay: CourtUsageDay
  status: AssignmentStatus | undefined
  neutral: boolean
}) {
  if (neutral || !status) {
    const bg = neutral ? NEUTRAL_BG : USAGE_BG[usageDay.heatLevel]
    const text = neutral ? NEUTRAL_TEXT : USAGE_TEXT[usageDay.heatLevel]
    return (
      <span
        className={`inline-block min-w-[26px] rounded-md px-1 py-0.5 text-center text-sm font-medium ${bg} ${text}`}
      >
        {dayNum}
      </span>
    )
  }

  const usage = USAGE_CSS[usageDay.heatLevel]
  const assign = STATUS_CSS[status]

  return (
    <span className="relative inline-block min-w-[26px] overflow-hidden rounded-md align-middle">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: usage,
          clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
        }}
      />
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: assign,
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
        }}
      />
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,0.45)',
          clipPath: 'polygon(1% 0, 100% 99%, 99% 100%, 0 1%)',
        }}
      />
      <span className="relative block px-1 py-0.5 text-center text-sm font-medium text-white">
        {dayNum}
      </span>
    </span>
  )
}

function MonthGrid({
  month,
  onDayClick,
  neutral,
  statusByDate,
}: {
  month: CourtUsageMonth
  onDayClick: (dateKey: string) => void
  neutral: boolean
  statusByDate: Map<string, AssignmentStatus>
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
      <div className="mb-2 font-bold text-body">{formatMonthLabel(month.monthDate)}</div>
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr>
            {WEEKDAY_HEADERS.map((h) => (
              <th key={h} className="p-1 text-center text-xs font-normal text-muted">
                {h}
              </th>
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
                const status = statusByDate.get(dateKey)
                return (
                  <td key={ci} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDayClick(dateKey)}
                      className="relative inline-block cursor-pointer"
                    >
                      {usageDay ? (
                        <>
                          <DayPill
                            dayNum={dayNum}
                            usageDay={usageDay}
                            status={status}
                            neutral={neutral}
                          />
                          <span className="absolute -right-3 -top-2 text-[10px] font-bold text-body">
                            {getSuperscript(usageDay)}
                          </span>
                        </>
                      ) : (
                        <span className="inline-block min-w-[26px] px-1 py-0.5 text-center text-sm text-muted">
                          {dayNum}
                        </span>
                      )}
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

export function CourtUsageGrid({
  months,
  onDayClick,
  neutral = false,
  statusByDate,
}: CourtUsageGridProps) {
  const status = statusByDate ?? new Map<string, AssignmentStatus>()
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => (
        <MonthGrid
          key={month.monthKey}
          month={month}
          onDayClick={onDayClick}
          neutral={neutral}
          statusByDate={status}
        />
      ))}
    </div>
  )
}
