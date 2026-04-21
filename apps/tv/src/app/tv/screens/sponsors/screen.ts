import type { Screen } from '@/lib/tv/screen-config'

export const sponsorsScreen: Screen = {
  url: '/tv/screens/sponsors',
  title: 'Vielen Dank!',
  visible: true,
  screenMeta: {
    sortKey: 50,
    duration: 10000,
    illustrationPath: '/assets/tv/illustrations/sponsors-illustration.svg',
    illustrationAlt: 'Sponsoren',
    angle: 225,
    rayLength: 350,
  },
}
