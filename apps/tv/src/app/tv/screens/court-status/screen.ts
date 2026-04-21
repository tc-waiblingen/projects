import type { Screen } from '@/lib/tv/screen-config'

export const courtStatusScreen: Screen = {
  url: '/tv/screens/court-status',
  title: 'Platzbelegung',
  visible: false,
  screenMeta: {
    sortKey: 22,
    duration: 20000,
    illustrationPath: '/assets/tv/illustrations/court-status-illustration.svg',
    illustrationAlt: 'Platzbelegung',
    angle: 15,
    rayLength: 380,
  },
}
