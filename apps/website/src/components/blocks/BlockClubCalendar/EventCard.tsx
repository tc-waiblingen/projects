import { clsx } from 'clsx/lite'
import { ContactInfo } from '@/components/elements/contact-info'
import { MatchDetails } from '@/components/elements/MatchDetails'
import { MapPinIcon } from '@/components/icons/map-pin-icon'
import { isMatchPlayed } from '@/lib/match-utils'
import { EventImage } from './EventImage'
import type {
  CalendarEvent,
  MatchEventMetadata,
  TournamentEventMetadata,
} from '@tcw/calendar'
import { isTournamentEvent, formatTournamentPlayDates } from '@tcw/calendar'

function formatDateRange(start: Date, end: Date): string {
  const startDay = start.getDate()
  const startMonth = start.getMonth() + 1
  const endDay = end.getDate()
  const endMonth = end.getMonth() + 1
  const endYear = end.getFullYear()

  // If same month, format as "1. – 8.2.2026"
  if (startMonth === endMonth) {
    return `${startDay}. – ${endDay}.${endMonth}.${endYear}`
  }

  // Different months: "31.1. – 8.2.2026"
  return `${startDay}.${startMonth}. – ${endDay}.${endMonth}.${endYear}`
}

function formatEventSpan(event: CalendarEvent, compact = false): string {
  if (event.playDates && event.playDates.length > 0) {
    return formatTournamentPlayDates(event.playDates, { compact })
  }
  if (event.endDate && event.endDate > event.startDate) {
    return compact
      ? formatCompactDateRange(event.startDate, event.endDate)
      : formatDateRange(event.startDate, event.endDate)
  }
  return ''
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="underline decoration-tcw-accent-400 underline-offset-2 hover:decoration-tcw-accent-600 dark:decoration-tcw-accent-500 dark:hover:decoration-tcw-accent-300"
    >
      {children}
    </a>
  )
}

function MatchGroup({ metadata }: { metadata: MatchEventMetadata }) {
  const { group, groupUrl } = metadata

  if (!group) return null

  return (
    <div className="mb-1">
      {groupUrl ? <ExternalLink href={groupUrl}>{group}</ExternalLink> : group}
    </div>
  )
}

function MatchLinks({ event }: { event: CalendarEvent }) {
  if (event.source !== 'match') {
    return null
  }

  const metadata = event.metadata as MatchEventMetadata
  const { reportUrl, result } = metadata

  if (!reportUrl) {
    return null
  }

  const matchPlayed = isMatchPlayed(result, reportUrl)
  const linkLabel = matchPlayed ? 'Spielbericht' : 'Spielberichts-Vorlage'

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <ExternalLink href={reportUrl}>{linkLabel}</ExternalLink>
    </div>
  )
}

function EventMetadata({ event }: { event: CalendarEvent }) {
  if (event.source === 'match') {
    return null
  }

  if (event.description) {
    return (
      <p className="text-sm text-muted">
        {event.description}
      </p>
    )
  }

  return null
}

function TournamentLinks({ event }: { event: CalendarEvent }) {
  if (event.source !== 'tournament') {
    return null
  }

  const metadata = event.metadata as TournamentEventMetadata
  const { callForEntriesUrl, registrationUrl } = metadata

  if (!callForEntriesUrl && !registrationUrl) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {callForEntriesUrl && (
        <ExternalLink href={callForEntriesUrl}>Ausschreibung</ExternalLink>
      )}
      {registrationUrl && (
        <ExternalLink href={registrationUrl}>Anmeldung</ExternalLink>
      )}
    </div>
  )
}

function EventItem({ event }: { event: CalendarEvent }) {
  const isMatch = event.source === 'match'
  const isTournament = isTournamentEvent(event)
  const isClub = event.source === 'club'
  const hasDateRange = !!(event.endDate && event.endDate > event.startDate)
  const hasPlayDates = !!(event.playDates && event.playDates.length > 0)
  const dateSpan = formatEventSpan(event)

  return (
    <div className="flex gap-3">
      {/* Time column */}
      <div className="w-32 shrink-0 text-sm text-muted">
        {event.isAllDay ? (
          <span className="whitespace-nowrap">{event.isMultiDay ? 'Mehrtägig' : 'Ganztägig'}</span>
        ) : event.startTime ? (
          <span className="whitespace-nowrap">
            {event.startTime}
            {event.endTime ? ` – ${event.endTime}` : ''} Uhr
          </span>
        ) : null}
        {event.imageUrl && (
          <div className="mt-2">
            <EventImage src={event.imageUrl} alt={event.title} />
          </div>
        )}
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-col gap-1">
        <div
          className={clsx(
            'font-medium text-tcw-accent-900 dark:text-white'
          )}
        >
          {isMatch ? (
            (() => {
              const matchMeta = event.metadata as MatchEventMetadata
              const matchPlayed = isMatchPlayed(matchMeta.result, matchMeta.reportUrl)
              return (
                <>
                  <MatchGroup metadata={matchMeta} />
                  <MatchDetails
                    homeTeam={matchMeta.homeTeam}
                    homeTeamUrl={matchMeta.homeTeamUrl}
                    awayTeam={matchMeta.awayTeam}
                    awayTeamUrl={matchMeta.awayTeamUrl}
                    result={matchPlayed ? matchMeta.result : undefined}
                    variant="compact"
                  />
                </>
              )
            })()
          ) : (
            event.title
          )}
        </div>

        {(event.location || (isMatch && !(event.metadata as MatchEventMetadata).isHome) || isTournament || (isClub && hasDateRange)) && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted">
            {isMatch && !(event.metadata as MatchEventMetadata).isHome && (
              <span>Auswärtsspiel</span>
            )}
            {isTournament && (
              <span>
                Turnier
                {(hasDateRange || hasPlayDates) && dateSpan && (
                  <> ({dateSpan})</>
                )}
              </span>
            )}
            {isClub && !isTournament && hasDateRange && (
              <span>{dateSpan}</span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon />
                {event.location}
              </span>
            )}
          </div>
        )}

        <EventMetadata event={event} />
        {event.url && (
          <ContactInfo
            type="website"
            value={event.url}
            title="Mehr Details"
            className="text-sm text-muted hover:text-body break-all"
          />
        )}
        <TournamentLinks event={event} />
        <MatchLinks event={event} />
      </div>
    </div>
  )
}

function formatCompactDate(date: Date): string {
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' })
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${weekday}, ${day}.${month}.`
}

function formatCompactDateRange(start: Date, end: Date): string {
  const startDay = start.getDate()
  const startMonth = start.getMonth() + 1
  const endDay = end.getDate()
  const endMonth = end.getMonth() + 1

  if (startMonth === endMonth) {
    return `${startDay}.\u202F\u2013\u202F${endDay}.${endMonth}.`
  }
  return `${startDay}.${startMonth}.\u202F\u2013\u202F${endDay}.${endMonth}.`
}

export function CompactEventRow({ event, displayDate }: { event: CalendarEvent; displayDate?: Date }) {
  const isMatch = event.source === 'match'
  const metadata = isMatch ? (event.metadata as MatchEventMetadata) : null

  const title = isMatch && metadata
    ? `${metadata.homeTeam} – ${metadata.awayTeam}`
    : event.title

  const hasDateRange = !!(event.endDate && event.endDate > event.startDate)
  const hasPlayDates = !!(event.playDates && event.playDates.length > 0)
  const compactSpan = formatEventSpan(event, true)

  const time = event.isAllDay
    ? 'Ganztägig'
    : event.startTime
      ? `${event.startTime} Uhr`
      : null

  return (
    <div className="flex items-baseline gap-3 py-1.5 text-sm">
      <span className="w-24 shrink-0 text-muted">{formatCompactDate(displayDate ?? event.startDate)}</span>
      <span className="w-20 shrink-0 tabular-nums text-muted">{time}</span>
      <span className="min-w-0 truncate font-medium text-body">
        {title}
        {(hasDateRange || hasPlayDates) && compactSpan && (
          <span className="font-normal text-muted"> ({compactSpan})</span>
        )}
      </span>
      {event.location && (
        <span className="ml-auto shrink-0 text-muted">📍 {event.location}</span>
      )}
    </div>
  )
}

interface DayCardProps {
  date: Date
  events: CalendarEvent[]
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function DayCard({ date, events }: DayCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-tcw-accent-200 bg-white dark:border-tcw-accent-700 dark:bg-tcw-accent-800">
      <div className="border-b border-tcw-accent-200 px-4 py-3 dark:border-tcw-accent-700">
        <h3
          data-toc="false"
          className="font-semibold text-tcw-accent-900 dark:text-white"
        >
          {formatDayHeader(date)}
        </h3>
      </div>
      <div className="flex flex-col divide-y divide-tcw-accent-100 dark:divide-tcw-accent-700">
        {events.map((event) => (
          <div key={event.id} className="px-4 py-3">
            <EventItem event={event} />
          </div>
        ))}
      </div>
    </div>
  )
}
