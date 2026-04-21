import type { Screen } from '@/lib/tv/screen-config'

export const teamScreen: Screen = {
  url: '/tv/screens/team',
  title: 'Vorstands-Team',
  visible: true,
  screenMeta: {
    sortKey: 40,
    duration: 10000,
    illustrationPath: '/assets/tv/illustrations/team-illustration.svg',
    illustrationAlt: 'Team',
    angle: 197,
    rayLength: 350,
  },
}
