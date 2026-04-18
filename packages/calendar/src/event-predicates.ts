import type { CalendarEvent, ClubEventMetadata } from './types'

export function isTournamentEvent(event: CalendarEvent): boolean {
  if (event.source === 'tournament') return true
  if (event.source === 'club') {
    const meta = event.metadata as ClubEventMetadata
    return meta.category === 'tournament'
  }
  return false
}
