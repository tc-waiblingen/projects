import type { Screen } from '@/lib/tv/screen-config'

export const matchResultsScreen: Screen = {
  url: '/tv/screens/match-results',
  title: 'Neueste Spielergebnisse',
  visible: true,
  screenMeta: {
    sortKey: 25,
    duration: 20000,
    illustrationPath: '/assets/tv/illustrations/match-results-illustration.svg',
    illustrationAlt: 'Spielergebnisse',
    angle: 350,
    rayLength: 480,
  },
}
