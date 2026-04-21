import type { Screen } from '@/lib/tv/screen-config'

export const instaNewsScreen: Screen = {
  url: '/tv/screens/insta-news',
  title: 'Insta-News',
  visible: true,
  screenMeta: {
    sortKey: 10,
    duration: 35000,
    illustrationPath: '/assets/tv/illustrations/insta-news-illustration.svg',
    illustrationAlt: 'Instagram -> News',
    angle: 35,
    rayLength: 290,
  },
}
