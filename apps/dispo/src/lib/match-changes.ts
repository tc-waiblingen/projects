import {
  buildMatchChangeSummary,
  fetchNrMatchChanges,
  fetchNrMatches,
  fetchNrTeams,
  type MatchChangeSummaryGroup,
} from '@tcw/calendar'
import { teamLabelWithGroup } from './team-label'

export async function fetchMatchChangeGroups(
  now: Date,
): Promise<MatchChangeSummaryGroup[]> {
  const from = new Date(now.getFullYear(), 0, 1)
  const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  try {
    const [changes, matches, teams] = await Promise.all([
      fetchNrMatchChanges({
        since,
        fields: ['__created', 'match_date', 'match_time', 'location'],
      }),
      fetchNrMatches(from, to),
      fetchNrTeams(),
    ])
    return buildMatchChangeSummary({
      changes,
      matches,
      teams,
      formatTeamLabel: (team) => teamLabelWithGroup(team.name, team.group),
    })
  } catch (error) {
    console.warn('Failed to load match changes', error)
    return []
  }
}
