import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { MatchChangeSummaryGroup } from '@tcw/calendar'
import { CourtUsageChanges } from '../CourtUsageChanges'

const now = new Date('2026-04-17T12:00:00Z')

describe('CourtUsageChanges', () => {
  it('renders nothing when groups is empty', () => {
    const { container } = render(<CourtUsageChanges groups={[]} now={now} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders heading + rows per entry with relative date headers', () => {
    const groups: MatchChangeSummaryGroup[] = [
      {
        dateKey: '2026-04-17',
        entries: [
          {
            kind: 'rescheduled-date',
            changedAt: '2026-04-17T10:00:00Z',
            matchId: 'm1',
            teamId: 't1',
            teamLabel: 'Herren 1',
            oldValue: '2026-05-10',
            newValue: '2026-05-17',
            matchDate: '2026-05-17',
            opponent: 'TV Musterstadt',
          },
        ],
      },
      {
        dateKey: '2026-04-15',
        entries: [
          {
            kind: 'created',
            changedAt: '2026-04-15T09:00:00Z',
            matchId: 'm2',
            teamId: 't2',
            teamLabel: 'Damen 2',
            oldValue: null,
            newValue: '2026-05-24',
            matchDate: '2026-05-24',
            matchTime: '10:00',
            opponent: 'TC Beispiel',
          },
          {
            kind: 'rescheduled-time',
            changedAt: '2026-04-15T11:00:00Z',
            matchId: 'm3',
            teamId: 't3',
            teamLabel: 'Jugend U18',
            oldValue: '14:00',
            newValue: '16:30',
            matchDate: '2026-05-30',
            matchTime: '16:30',
            opponent: 'TC Gegner',
          },
        ],
      },
    ]

    render(<CourtUsageChanges groups={groups} now={now} />)

    expect(
      screen.getByRole('heading', { name: 'Änderungen (letzte 30 Tage)' }),
    ).toBeDefined()
    expect(screen.getByText('heute')).toBeDefined()
    expect(screen.getByText('vor 2 Tagen')).toBeDefined()
    expect(screen.getByText('Herren 1')).toBeDefined()
    expect(screen.getByText('10.05. → 17.05.')).toBeDefined()
    expect(screen.getByText('neu angesetzt')).toBeDefined()
    expect(screen.getByText('14:00 → 16:30 Uhr')).toBeDefined()
    expect(screen.getByText('Spieltermin: 24.05. 10:00')).toBeDefined()
    expect(screen.getByText('Spieltermin: 30.05. 16:30')).toBeDefined()
  })
})
