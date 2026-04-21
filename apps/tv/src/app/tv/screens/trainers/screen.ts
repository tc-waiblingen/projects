import type { Screen } from '@/lib/tv/screen-config'

export const trainersScreen: Screen = {
  url: '/tv/screens/trainers',
  title: 'Akkreditierte Trainer',
  visible: true,
  screenMeta: {
    sortKey: 45,
    duration: 10000,
    illustrationPath: '/assets/tv/illustrations/ball-machine.svg',
    illustrationAlt: 'Trainers',
    angle: 10,
    rayLength: 450,
    showLogoInTopBar: false,
  },
}
