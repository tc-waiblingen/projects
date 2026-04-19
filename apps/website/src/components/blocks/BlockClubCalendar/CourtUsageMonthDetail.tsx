'use client'

import type { CourtUsageMonth } from '@tcw/calendar'
import { CourtUsageDayDetail } from './CourtUsageDayDetail'

interface CourtUsageMonthDetailProps {
  month: CourtUsageMonth
  onDayClick: (dateKey: string) => void
  onBack: () => void
}

function formatMonthHeader(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function CourtUsageMonthDetail({ month, onDayClick, onBack }: CourtUsageMonthDetailProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 cursor-pointer text-sm text-muted hover:text-body hover:underline"
      >
        ← Zurück zur Übersicht
      </button>
      <h3 className="mb-6 border-b-[3px] border-gray-900 pb-2 text-xl font-bold text-body dark:border-gray-100">
        {formatMonthHeader(month.monthDate)}
      </h3>
      <div className="flex flex-col gap-6">
        {month.days.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onDayClick(day.dateKey)}
            className="cursor-pointer rounded-lg border border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
          >
            <CourtUsageDayDetail day={day} />
          </button>
        ))}
      </div>
    </div>
  )
}
