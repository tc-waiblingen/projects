/**
 * TV screen configuration and rotation logic.
 */

export interface ScreenMeta {
  sortKey: number
  visible: boolean
  duration: number
  illustrationPath: string
  illustrationAlt: string
  angle: number
  rayLength: number
  showLogoInTopBar?: boolean
}

export interface Screen {
  url: string
  title: string
  screenMeta: ScreenMeta
}

/**
 * Configuration for all TV screens.
 * Screens are displayed in order of their sortKey.
 */
export const SCREENS: Screen[] = [
  {
    url: '/tv/screens/welcome-guests',
    title: 'Herzlich willkommen',
    screenMeta: {
      sortKey: 5,
      visible: true,
      duration: 20000,
      illustrationPath: '/assets/tv/illustrations/welcome-guests-illustration.svg',
      illustrationAlt: 'Willkommen',
      angle: 90,
      rayLength: 200,
    },
  },
  {
    url: '/tv/screens/insta-news',
    title: 'Insta-News',
    screenMeta: {
      sortKey: 10,
      visible: true,
      duration: 35000,
      illustrationPath: '/assets/tv/illustrations/insta-news-illustration.svg',
      illustrationAlt: 'Instagram -> News',
      angle: 35,
      rayLength: 290,
    },
  },
  {
    url: '/tv/screens/club-schedule',
    title: 'Vereinskalender',
    screenMeta: {
      sortKey: 20,
      visible: true,
      duration: 30000,
      illustrationPath: '/assets/tv/illustrations/club-schedule-illustration.svg',
      illustrationAlt: 'Kalendertag',
      angle: 331,
      rayLength: 410,
    },
  },
  {
    url: '/tv/screens/court-status',
    title: 'Platzbelegung',
    screenMeta: {
      sortKey: 22,
      visible: false,
      duration: 20000,
      illustrationPath: '/assets/tv/illustrations/court-status-illustration.svg',
      illustrationAlt: 'Platzbelegung',
      angle: 15,
      rayLength: 380,
    },
  },
  {
    url: '/tv/screens/match-results',
    title: 'Neueste Spielergebnisse',
    screenMeta: {
      sortKey: 25,
      visible: true,
      duration: 20000,
      illustrationPath: '/assets/tv/illustrations/match-results-illustration.svg',
      illustrationAlt: 'Spielergebnisse',
      angle: 350,
      rayLength: 480,
    },
  },
  {
    url: '/tv/screens/club-office',
    title: 'Geschäftsstelle',
    screenMeta: {
      sortKey: 30,
      visible: true,
      duration: 15000,
      illustrationPath: '/assets/tv/illustrations/office-illustration.svg',
      illustrationAlt: 'Geschäftsstelle',
      angle: 145,
      rayLength: 420,
    },
  },
  {
    url: '/tv/screens/team',
    title: 'Vorstands-Team',
    screenMeta: {
      sortKey: 40,
      visible: true,
      duration: 10000,
      illustrationPath: '/assets/tv/illustrations/team-illustration.svg',
      illustrationAlt: 'Team',
      angle: 197,
      rayLength: 350,
    },
  },
  {
    url: '/tv/screens/trainers',
    title: 'Akkreditierte Trainer',
    screenMeta: {
      sortKey: 45,
      visible: true,
      duration: 10000,
      illustrationPath: '/assets/tv/illustrations/ball-machine.svg',
      illustrationAlt: 'Trainers',
      angle: 10,
      rayLength: 450,
      showLogoInTopBar: false,
    },
  },
  {
    url: '/tv/screens/sponsors',
    title: 'Vielen Dank!',
    screenMeta: {
      sortKey: 50,
      visible: true,
      duration: 10000,
      illustrationPath: '/assets/tv/illustrations/sponsors-illustration.svg',
      illustrationAlt: 'Sponsoren',
      angle: 225,
      rayLength: 350,
    },
  },
]

/**
 * Get visible screens sorted by sortKey.
 */
export function getVisibleScreens(): Screen[] {
  return SCREENS.filter((s) => s.screenMeta.visible).sort((a, b) => a.screenMeta.sortKey - b.screenMeta.sortKey)
}

/**
 * Get the next screen index in the rotation.
 * @param currentUrl - Current screen URL
 * @returns Next screen index
 */
export function getNextScreenIndex(currentUrl: string): number {
  const screens = getVisibleScreens()
  const currentIndex = screens.findIndex((s) => s.url === currentUrl)
  return currentIndex >= 0 ? (currentIndex + 1) % screens.length : 0
}

/**
 * Get screen by URL.
 * @param url - Screen URL
 * @returns Screen or undefined
 */
export function getScreenByUrl(url: string): Screen | undefined {
  return SCREENS.find((s) => s.url === url)
}
