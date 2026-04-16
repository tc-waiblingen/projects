export type CategoryFilter =
  | 'matches'
  | 'tournaments'
  | 'club'
  | 'beginners'
  | 'children'

export const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  matches: 'Punktspiele',
  tournaments: 'Turniere',
  club: 'Vereinstermine',
  beginners: 'Für Einsteiger',
  children: 'Kinder',
}

export interface ResolvedTeam {
  season: string
  name: string
}

export interface GetCalendarNameArgs {
  category: CategoryFilter | null
  team: ResolvedTeam | null
  teamId: string | null
}

const BASE_NAME = 'TCW-Kalender'

export function getCalendarName(args: GetCalendarNameArgs): string {
  const { category, team, teamId } = args

  if (team) {
    return `TCW: ${team.season} - ${team.name}`
  }

  if (teamId) {
    return `${BASE_NAME} (${teamId})`
  }

  if (category) {
    return `${BASE_NAME} (${CATEGORY_LABELS[category]})`
  }

  return BASE_NAME
}
