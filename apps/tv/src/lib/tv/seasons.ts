/**
 * Seasonal detection for TV display decorations.
 */

/**
 * Check if it's Christmas hat season (Dec 5-26) in Berlin timezone.
 * Can be overridden with FORCE_SEASON=hat environment variable.
 */
export function isHatSeasonInBerlin(date = new Date()): boolean {
  // Allow forcing a season via environment variable for debugging
  const forceSeason = process.env.FORCE_SEASON
  if (forceSeason === 'hat') return true
  if (forceSeason === 'champagne') return false

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  return month === 12 && day >= 5 && day <= 26
}

/**
 * Check if it's New Year champagne season (Dec 27-31 or Jan 1) in Berlin timezone.
 * Can be overridden with FORCE_SEASON=champagne environment variable.
 */
export function isChampagneSeasonInBerlin(date = new Date()): boolean {
  // Allow forcing a season via environment variable for debugging
  const forceSeason = process.env.FORCE_SEASON
  if (forceSeason === 'champagne') return true
  if (forceSeason === 'hat') return false

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  return (month === 12 && day >= 27 && day <= 31) || (month === 1 && day === 1)
}
