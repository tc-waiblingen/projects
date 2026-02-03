/**
 * Configuration for post weight calculation
 */
const BASE_WEIGHT = 1.0
const DECAY_FACTOR = 0.8 // 20% loss per year
const MIN_WEIGHT = 0.3
const NO_DATE_WEIGHT = 0.6

/**
 * Calculate Pagefind weight for a post based on its publication date.
 * Uses exponential decay: weight = base × (decay_factor ^ years_old)
 *
 * @param publishedAt - ISO date string or null/undefined
 * @returns Weight value between MIN_WEIGHT and BASE_WEIGHT
 */
export function calculatePostWeight(publishedAt: string | null | undefined): number {
  if (!publishedAt) {
    return NO_DATE_WEIGHT
  }

  const publishedDate = new Date(publishedAt)
  const now = new Date()

  // Calculate years difference (can be fractional)
  const yearsOld = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

  // Don't boost future posts
  if (yearsOld < 0) {
    return BASE_WEIGHT
  }

  // Calculate weight with exponential decay
  const weight = BASE_WEIGHT * Math.pow(DECAY_FACTOR, yearsOld)

  // Apply minimum floor and round to 2 decimal places
  return Math.round(Math.max(weight, MIN_WEIGHT) * 100) / 100
}
