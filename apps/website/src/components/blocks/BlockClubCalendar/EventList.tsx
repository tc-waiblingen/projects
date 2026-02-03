import type { CalendarEvent } from '@tcw/calendar'
import { groupEventsByMonth, sortDayEvents, formatMonthHeader } from '@tcw/calendar'
import { DayCard } from './EventCard'

interface EventListProps {
  events: CalendarEvent[]
}

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="text-tcw-accent-500 dark:text-tcw-accent-400">
        Keine Termine vorhanden.
      </p>
    )
  }

  const monthGroups = groupEventsByMonth(events)

  return (
    <div className="flex flex-col gap-10">
      {monthGroups.map((monthGroup) => (
        <div key={monthGroup.monthKey} className="flex flex-col gap-4">
          <h2 className="sticky top-(--scroll-padding-top) z-10 -mx-4 bg-tcw-red-100 px-4 py-2 text-xl font-bold text-tcw-accent-900 dark:bg-tcw-red-900 dark:text-white">
            {formatMonthHeader(monthGroup.monthDate)}
          </h2>
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
