import { fetchWelcomeGuestsPresence } from '@/lib/tv/fetchers'
import type { Screen } from '@/lib/tv/screen-config'

export const welcomeGuestsScreen: Screen = {
  url: '/tv/screens/welcome-guests',
  title: 'Herzlich Willkommen',
  visible: async () => (await fetchWelcomeGuestsPresence()).hasGuests,
  suppresses: ['/tv/screens/team', '/tv/screens/trainers', '/tv/screens/match-results'],
  screenMeta: {
    sortKey: 5,
    duration: 20000,
    illustrationPath: '/assets/tv/illustrations/welcome-guests-illustration.svg',
    illustrationAlt: 'Willkommen',
    angle: 90,
    rayLength: 200,
  },
}
