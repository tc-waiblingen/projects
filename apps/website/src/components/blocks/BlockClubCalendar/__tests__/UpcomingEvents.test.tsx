import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CalendarEvent, DayGroup, MatchEventMetadata, TournamentEventMetadata } from '@tcw/calendar'
import { UpcomingEvents } from '../UpcomingEvents'

const now = new Date(2026, 10, 17, 12, 0) // Tue Nov 17, 2026

function createEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'event',
    source: 'club',
    title: 'Vereinstermin',
    description: null,
    location: null,
    startDate: new Date(2026, 10, 21),
    endDate: null,
    startTime: '10:00',
    endTime: null,
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {},
    displayWeight: 1,
    ...overrides,
  }
}

function day(date: Date, events: CalendarEvent[]): DayGroup {
  return { dateKey: date.toISOString(), date, events }
}

describe('UpcomingEvents', () => {
  it('renders nothing without days', () => {
    const { container } = render(<UpcomingEvents days={[]} now={now} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('highlights the first day with a relative label and event count', () => {
    const date = new Date(2026, 10, 21)
    render(
      <UpcomingEvents
        days={[day(date, [createEvent({ id: 'a', title: 'A' }), createEvent({ id: 'b', title: 'B' })])]}
        now={now}
      />,
    )

    expect(screen.getByText('Als Nächstes · in 4 Tagen')).toBeInTheDocument()
    expect(screen.getByText(/2 Termine/)).toBeInTheDocument()
  })

  it('labels today and tomorrow', () => {
    const { rerender } = render(<UpcomingEvents days={[day(new Date(2026, 10, 17), [createEvent({})])]} now={now} />)
    expect(screen.getByText('Als Nächstes · Heute')).toBeInTheDocument()

    rerender(<UpcomingEvents days={[day(new Date(2026, 10, 18), [createEvent({})])]} now={now} />)
    expect(screen.getByText('Als Nächstes · Morgen')).toBeInTheDocument()
  })

  it('caps the highlighted day at five events and links to the calendar', () => {
    const events = Array.from({ length: 7 }, (_, i) => createEvent({ id: String(i), title: `Event ${i}` }))
    render(<UpcomingEvents days={[day(new Date(2026, 10, 21), events)]} now={now} />)

    expect(screen.getByText('Event 4')).toBeInTheDocument()
    expect(screen.queryByText('Event 5')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\+2 weitere Termine/ })).toHaveAttribute('href', '/kalender')
  })

  it('uses singular wording for a single hidden event', () => {
    const events = Array.from({ length: 6 }, (_, i) => createEvent({ id: String(i), title: `Event ${i}` }))
    render(<UpcomingEvents days={[day(new Date(2026, 10, 21), events)]} now={now} />)

    expect(screen.getByRole('link', { name: /\+1 weiterer Termin/ })).toBeInTheDocument()
  })

  it('omits the kind label for club events', () => {
    render(<UpcomingEvents days={[day(new Date(2026, 10, 21), [createEvent({})])]} now={now} />)

    expect(screen.queryByText('Verein')).not.toBeInTheDocument()
    expect(screen.queryByText(/Verein ·/)).not.toBeInTheDocument()
  })

  it('shows a date span only for multi-day events', () => {
    const singleDay = createEvent({
      id: 'single',
      endDate: new Date(2026, 10, 21, 18, 0),
      endTime: '18:00',
    })
    const multiDay = createEvent({
      id: 'multi',
      startDate: new Date(2026, 10, 21),
      endDate: new Date(2026, 10, 23),
      startTime: null,
      isAllDay: true,
      isMultiDay: true,
    })
    render(<UpcomingEvents days={[day(new Date(2026, 10, 21), [singleDay, multiDay])]} now={now} />)

    expect(screen.getAllByText(/21\. – 23\.11\.2026/)).toHaveLength(1)
    expect(screen.getByText('Mehr\u00ADtägig')).toBeInTheDocument()
  })

  it('shortens club names used as location', () => {
    render(
      <UpcomingEvents
        days={[day(new Date(2026, 10, 21), [createEvent({ location: 'Tennis-Club Waiblingen e.V.' })])]}
        now={now}
      />,
    )

    expect(screen.getByText('Waiblingen')).toBeInTheDocument()
  })

  it('shows matches as pairings with team label', () => {
    const match = createEvent({
      source: 'match',
      metadata: { homeTeam: 'TC Waiblingen', awayTeam: 'TSV Korb', isHome: true, teamName: 'Damen' } as MatchEventMetadata,
    })
    render(<UpcomingEvents days={[day(new Date(2026, 10, 21), [match])]} now={now} />)

    expect(screen.getByText('TC Waiblingen – TSV Korb')).toBeInTheDocument()
    expect(screen.getByText('Punktspiel · Damen')).toBeInTheDocument()
  })

  it('lists following days with all their events', () => {
    render(
      <UpcomingEvents
        days={[
          day(new Date(2026, 10, 21), [createEvent({ id: 'first', title: 'First' })]),
          day(new Date(2026, 10, 22), [
            createEvent({ id: 'x', title: 'Sunday A' }),
            createEvent({ id: 'y', title: 'Sunday B' }),
          ]),
        ]}
        now={now}
      />,
    )

    expect(screen.getByText('Sunday A')).toBeInTheDocument()
    expect(screen.getByText('Sunday B')).toBeInTheDocument()
    expect(screen.getByText('22.11.')).toBeInTheDocument()
  })

  it('links event details and tournament documents on featured and following days', () => {
    const tournament = createEvent({
      id: 't',
      source: 'tournament',
      title: 'Clubmeisterschaft',
      metadata: {
        callForEntriesUrl: 'https://example.com/ausschreibung.pdf',
        registrationUrl: 'https://example.com/anmeldung',
      } as TournamentEventMetadata,
    })
    const clubEvent = createEvent({ id: 'c', title: 'Saisonabschluss', url: 'https://example.com/fest' })
    render(
      <UpcomingEvents
        days={[day(new Date(2026, 10, 21), [tournament]), day(new Date(2026, 10, 22), [clubEvent])]}
        now={now}
      />,
    )

    expect(screen.getByRole('link', { name: 'Ausschreibung' })).toHaveAttribute('href', 'https://example.com/ausschreibung.pdf')
    expect(screen.getByRole('link', { name: 'Anmeldung' })).toHaveAttribute('href', 'https://example.com/anmeldung')
    const details = screen.getByRole('link', { name: 'Mehr Details' })
    expect(details).toHaveAttribute('href', 'https://example.com/fest')
    expect(details).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  })

  it('does not link match reports', () => {
    const match = createEvent({
      source: 'match',
      metadata: { homeTeam: 'A', awayTeam: 'B', isHome: true, reportUrl: 'https://example.com/report' } as MatchEventMetadata,
    })
    render(<UpcomingEvents days={[day(new Date(2026, 10, 21), [match])]} now={now} />)

    expect(screen.queryByRole('link', { name: /Spielbericht/ })).not.toBeInTheDocument()
  })
})
