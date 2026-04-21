import type { Screen } from '@/lib/tv/screen-config'

export const clubScheduleScreen: Screen = {
  url: '/tv/screens/club-schedule',
  title: 'Vereinskalender',
  visible: true,
  screenMeta: {
    sortKey: 20,
    duration: 30000,
    illustrationPath: '/assets/tv/illustrations/club-schedule-illustration.svg',
    illustrationAlt: 'Kalendertag',
    angle: 331,
    rayLength: 410,
  },
}
