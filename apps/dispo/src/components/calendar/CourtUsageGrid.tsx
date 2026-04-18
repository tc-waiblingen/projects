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
  low: 'bg-zinc-400/80',
  medium: 'bg-zinc-600/80',
  high: 'bg-zinc-800/80',
} as const

const USAGE_TEXT = {
  low: 'text-white',
  medium: 'text-white',
  high: 'text-white',
} as const

const STATUS_BG: Record<AssignmentStatus, string> = {
  none: 'bg-red-900/85',
  partial: 'bg-orange-700/90',
  exact: 'bg-green-800/90',
  over: 'bg-emerald-500/75',
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

  return (
    <span className="relative inline-block min-w-[26px] overflow-hidden rounded-md align-middle">
      <span
        aria-hidden
        className={`absolute inset-0 ${USAGE_BG[usageDay.heatLevel]}`}
        style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }}
      />
      <span
        aria-hidden
        className={`absolute inset-0 ${STATUS_BG[status]}`}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-black/40"
        style={{ clipPath: 'polygon(1% 0, 100% 99%, 99% 100%, 0 1%)' }}
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
