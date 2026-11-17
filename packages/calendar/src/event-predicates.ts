import type { CalendarEvent, ClubEventMetadata } from './types'

export function isTournamentEvent(event: CalendarEvent): boolean {
  if (event.source === 'tournament') return true
  if (event.source === 'club') {
    const meta = event.metadata as ClubEventMetadata
    return meta.category === 'tournament'
  }
  return false
}

export type CalendarCategory = 'all' | 'matches' | 'tournaments' | 'club' | 'beginners' | 'children'

export function matchesCategory(event: CalendarEvent, category: CalendarCategory): boolean {
  switch (category) {
    case 'all':
      return true
    case 'matches':
      return event.source === 'match'
    case 'tournaments':
      return isTournamentEvent(event)
    case 'club':
      return event.source === 'club' || event.source === 'app'
    case 'beginners':
    case 'children':
      return event.source === 'club' && (event.metadata as ClubEventMetadata).category === category
  }
}
