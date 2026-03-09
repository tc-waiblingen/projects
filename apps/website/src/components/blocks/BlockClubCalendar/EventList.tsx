import { clsx } from 'clsx/lite'
import type { CalendarEvent } from '@tcw/calendar'
import { groupEventsByMonth, sortDayEvents, formatMonthHeader } from '@tcw/calendar'
import { DayCard, CompactEventRow } from './EventCard'

interface EventListProps {
  events: CalendarEvent[]
  style?: 'default' | 'list'
  alignment?: 'left' | 'center'
}

export function EventList({ events, style = 'default', alignment = 'left' }: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="text-tcw-accent-500 dark:text-tcw-accent-400">
        Keine Termine vorhanden.
      </p>
    )
  }

  const monthGroups = groupEventsByMonth(events)

  if (style === 'list') {
    return (
      <div className={clsx('flex max-w-2xl flex-col gap-6', alignment === 'center' && 'mx-auto')}>
        {monthGroups.map((monthGroup) => (
          <div key={monthGroup.monthKey} className="flex flex-col">
            <h3 className="sticky top-(--scroll-padding-top) z-10 -mx-4 bg-tcw-red-100 px-4 py-2 text-xl font-bold text-tcw-accent-900 dark:bg-tcw-red-900 dark:text-white">
              {formatMonthHeader(monthGroup.monthDate)}
            </h3>
            <div className="flex flex-col divide-y divide-tcw-accent-100 dark:divide-tcw-accent-700">
              {monthGroup.days.flatMap((dayGroup) =>
                sortDayEvents(dayGroup.events).map((event) => (
                  <CompactEventRow key={`${dayGroup.dateKey}-${event.id}`} event={event} displayDate={dayGroup.date} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {monthGroups.map((monthGroup) => (
        <div key={monthGroup.monthKey} className="flex flex-col gap-4">
          <h3 className="sticky top-(--scroll-padding-top) z-10 -mx-4 bg-tcw-red-100 px-4 py-2 text-xl font-bold text-tcw-accent-900 dark:bg-tcw-red-900 dark:text-white">
            {formatMonthHeader(monthGroup.monthDate)}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {monthGroup.days.map((dayGroup) => (
              <DayCard
                key={dayGroup.dateKey}
                date={dayGroup.date}
                events={sortDayEvents(dayGroup.events)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
