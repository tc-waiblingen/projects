import type { CalendarEvent, DayGroup, MatchEventMetadata } from '@tcw/calendar'
import { formatLocationName, isTournamentEvent } from '@tcw/calendar'
import { PlainButtonLink } from '@/components/elements/button'
import { ArrowNarrowRightIcon } from '@/components/icons/arrow-narrow-right-icon'
import { MapPinIcon } from '@/components/icons/map-pin-icon'
import { teamLabelWithGroup } from '@/lib/team-label'
import { EventLinks, formatEventSpan } from './EventCard'

export const CALENDAR_HREF = '/kalender'
const MAX_FEATURED_EVENTS = 5

function eventTitle(event: CalendarEvent): string {
  if (event.source === 'match') {
    const meta = event.metadata as MatchEventMetadata
    return `${meta.homeTeam} – ${meta.awayTeam}`
  }
  return event.title
}

function eventKind(event: CalendarEvent): string | null {
  if (event.source === 'match') {
    const meta = event.metadata as MatchEventMetadata
    return meta.teamName ? `Punktspiel · ${teamLabelWithGroup(meta.teamName, meta.group)}` : 'Punktspiel'
  }
  if (isTournamentEvent(event)) return 'Turnier'
  return null
}

function eventTime(event: CalendarEvent): string | null {
  // Soft hyphen lets "Mehrtägig" break as "Mehr-tägig" in narrow columns
  if (event.isAllDay) return event.isMultiDay ? 'Mehr\u00ADtägig' : 'Ganztägig'
  return event.startTime
}

function eventDetails(event: CalendarEvent): string[] {
  const spansDays = event.isMultiDay || (event.playDates?.length ?? 0) > 1
  return [
    spansDays ? formatEventSpan(event) : '',
    event.source === 'match' && !(event.metadata as MatchEventMetadata).isHome ? 'Auswärtsspiel' : '',
  ].filter(Boolean)
}

function EventMeta({ parts, location, className }: { parts: string[]; location: string | null; className: string }) {
  if (parts.length === 0 && !location) return null
  return (
    <span className={className}>
      {parts.join(' · ')}
      {parts.length > 0 && location && ' · '}
      {location && (
        <span className="inline-flex items-center gap-1">
          <MapPinIcon />
          {formatLocationName(location)}
        </span>
      )}
    </span>
  )
}

function relativeDayLabel(date: Date, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Heute'
  if (days === 1) return 'Morgen'
  return `in ${days} Tagen`
}

function FeaturedDay({ day, now }: { day: DayGroup; now: Date }) {
  const visible = day.events.slice(0, MAX_FEATURED_EVENTS)
  const hiddenCount = day.events.length - visible.length
  const weekday = day.date.toLocaleDateString('de-DE', { weekday: 'long' })

  return (
    <article className="flex flex-col gap-6 rounded-lg bg-tcw-red-600 p-6 text-white sm:p-10">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-wide text-tcw-red-100 uppercase">
          Als Nächstes · {relativeDayLabel(day.date, now)}
        </p>
        <h3 data-toc="false" className="text-5xl font-bold text-white sm:text-7xl">
          {day.date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
        </h3>
        <p className="text-lg text-tcw-red-100">
          {weekday}
          {day.events.length > 1 && ` · ${day.events.length} Termine`}
        </p>
      </div>
      <ul className="flex flex-col">
        {visible.map((event) => (
          <li key={event.id} className="flex items-baseline gap-5 border-t border-tcw-red-400 py-3">
            <span className="w-14 shrink-0 font-bold tabular-nums hyphens-manual sm:text-lg">{eventTime(event)}</span>
            <div className="flex min-w-0 flex-col gap-0.5">
              {eventKind(event) && (
                <span className="text-xs font-semibold tracking-wide text-tcw-red-100 uppercase">{eventKind(event)}</span>
              )}
              <span className="text-lg font-semibold sm:text-xl">{eventTitle(event)}</span>
              <EventMeta parts={eventDetails(event)} location={event.location} className="text-sm text-tcw-red-100" />
              <EventLinks event={event} tone="inverted" />
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <PlainButtonLink href={CALENDAR_HREF} color="light" className="self-start">
          +{hiddenCount} {hiddenCount === 1 ? 'weiterer Termin' : 'weitere Termine'} <ArrowNarrowRightIcon />
        </PlainButtonLink>
      )}
    </article>
  )
}

function DayRow({ day }: { day: DayGroup }) {
  return (
    <li className="flex gap-5 px-6 py-4">
      <div className="flex w-16 shrink-0 flex-col">
        <span className="text-xl font-bold text-body">
          {day.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
        </span>
        <span className="text-sm text-subtle">{day.date.toLocaleDateString('de-DE', { weekday: 'short' })}</span>
      </div>
      <ul className="flex min-w-0 flex-col gap-3">
        {day.events.map((event) => (
          <li key={event.id} className="flex flex-col gap-0.5">
            <span className="font-semibold text-body">{eventTitle(event)}</span>
            <EventMeta
              parts={[
                eventKind(event),
                event.isAllDay ? eventTime(event) : event.startTime && `${event.startTime} Uhr`,
                ...eventDetails(event),
              ].filter((part): part is string => !!part)}
              location={event.location}
              className="text-sm text-subtle"
            />
            <EventLinks event={event} />
          </li>
        ))}
      </ul>
    </li>
  )
}

export function UpcomingEvents({ days, now }: { days: DayGroup[]; now: Date }) {
  const [featured, ...rest] = days

  if (!featured) return null

  return (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
      <FeaturedDay day={featured} now={now} />
      {rest.length > 0 && (
        <ul className="flex flex-col divide-y divide-tcw-accent-100 rounded-lg border border-tcw-accent-200 bg-white dark:divide-tcw-accent-700 dark:border-tcw-accent-700 dark:bg-tcw-accent-800">
          {rest.map((day) => (
            <DayRow key={day.dateKey} day={day} />
          ))}
        </ul>
      )}
    </div>
  )
}
