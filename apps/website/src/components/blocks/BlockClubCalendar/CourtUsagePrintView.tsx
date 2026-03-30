'use client'

import type { CourtUsageMonth } from '@tcw/calendar'
import { CourtUsageDayDetail, formatCourtType } from './CourtUsageDayDetail'

interface CourtUsagePrintViewProps {
  months: CourtUsageMonth[]
}

function formatMonthHeader(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function CourtUsagePrintView({ months }: CourtUsagePrintViewProps) {
  return (
    <div className="hidden print:block">
      {months.map((month) => (
        <div key={month.monthKey} className="mb-8">
          <h2 className="mb-4 border-b-[3px] border-gray-900 pb-1 text-lg font-bold">
            {formatMonthHeader(month.monthDate)}{' '}
            <span className="text-sm font-normal text-gray-500">({formatCourtType(month.courtType)})</span>
          </h2>
          {month.days.length === 0 ? (
            <p className="text-sm text-gray-500">Keine Heimspiele oder Turniere</p>
          ) : (
            <div className="flex flex-col gap-4">
              {month.days.map((day) => (
                <CourtUsageDayDetail key={day.dateKey} day={day} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
