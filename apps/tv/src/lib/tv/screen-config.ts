/**
 * TV screen configuration and rotation logic.
 *
 * Each screen owns its own definition (metadata + activation rule +
 * suppression effects) in its own module next to the screen's page.
 * This file only composes them and resolves the active set.
 */

import { welcomeGuestsScreen } from '@/app/tv/screens/welcome-guests/screen'
import { instaNewsScreen } from '@/app/tv/screens/insta-news/screen'
import { clubScheduleScreen } from '@/app/tv/screens/club-schedule/screen'
import { courtStatusScreen } from '@/app/tv/screens/court-status/screen'
import { matchResultsScreen } from '@/app/tv/screens/match-results/screen'
import { clubOfficeScreen } from '@/app/tv/screens/club-office/screen'
import { teamScreen } from '@/app/tv/screens/team/screen'
import { trainersScreen } from '@/app/tv/screens/trainers/screen'
import { sponsorsScreen } from '@/app/tv/screens/sponsors/screen'

export interface ScreenMeta {
  sortKey: number
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
  /** Static flag or function evaluated per request. */
  visible: boolean | (() => boolean | Promise<boolean>)
  /** URLs of screens this screen hides while it is itself active. */
  suppresses?: string[]
}

/**
 * Screen shape after `getActiveScreens` has resolved visibility — safe to
 * pass across the server/client boundary (no function-typed fields).
 */
export type ResolvedScreen = Omit<Screen, 'visible'>

export const SCREENS: Screen[] = [
  welcomeGuestsScreen,
  instaNewsScreen,
  clubScheduleScreen,
  courtStatusScreen,
  matchResultsScreen,
  clubOfficeScreen,
  teamScreen,
  trainersScreen,
  sponsorsScreen,
]

/**
 * Resolve the screens that should be shown right now, sorted by sortKey.
 * Evaluates each screen's `visible` rule, then drops any screen suppressed
 * by another active screen's `suppresses` list. Strips the `visible`
 * function so the result is safe to pass to client components.
 */
export async function getActiveScreens(): Promise<ResolvedScreen[]> {
  const resolved = await Promise.all(
    SCREENS.map(async (s) => {
      const visible = typeof s.visible === 'function' ? await s.visible() : s.visible
      return visible ? s : null
    }),
  )
  const active = resolved.filter((s): s is Screen => s !== null)

  const suppressed = new Set<string>()
  for (const s of active) s.suppresses?.forEach((url) => suppressed.add(url))

  return active
    .filter((s) => !suppressed.has(s.url))
    .sort((a, b) => a.screenMeta.sortKey - b.screenMeta.sortKey)
    .map((s) => ({ url: s.url, title: s.title, screenMeta: s.screenMeta, suppresses: s.suppresses }))
}

/**
 * Get the next screen index in the rotation.
 */
export async function getNextScreenIndex(currentUrl: string): Promise<number> {
  const screens = await getActiveScreens()
  const currentIndex = screens.findIndex((s) => s.url === currentUrl)
  return currentIndex >= 0 ? (currentIndex + 1) % screens.length : 0
}

/**
 * Get screen by URL (static metadata lookup; ignores visibility).
 */
export function getScreenByUrl(url: string): Screen | undefined {
  return SCREENS.find((s) => s.url === url)
}
