import type { Screen } from '@/lib/tv/screen-config'

export const clubOfficeScreen: Screen = {
  url: '/tv/screens/club-office',
  title: 'Geschäftsstelle',
  visible: true,
  screenMeta: {
    sortKey: 30,
    duration: 15000,
    illustrationPath: '/assets/tv/illustrations/office-illustration.svg',
    illustrationAlt: 'Geschäftsstelle',
    angle: 145,
    rayLength: 420,
  },
}
