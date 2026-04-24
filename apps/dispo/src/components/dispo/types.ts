import type { DispoCourt } from '@/lib/directus/courts'
import type { DayMatch } from '@/lib/matches'

export type DispoView = 'vtimeline' | 'map'

export interface DispoAssignment {
  matchId: string
  courtIds: number[]
  startTime: string
  durationH: number
}

export interface DispoMatch extends DayMatch {
  minCourts: number
  maxCourts: number
}

export interface RecentChangeInfo {
  matchId: string
  kind: 'new' | 'time' | 'location' | 'other'
}

export interface Issue {
  key: string
  matchId: string
  title: string
  detail: string
}

export type CourtsById = Map<number, DispoCourt>
export type CourtsByName = Map<string, DispoCourt>
