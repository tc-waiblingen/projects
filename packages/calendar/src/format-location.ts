const CLUB_PREFIX = /^(?:Tennis-?Club|Tennisclub|Tennisgemeinschaft|TC|TSV|TSG|TSC|TuS|TV|TG|SV|SG|SC|SpVgg|VfL|VfB)\s+/i
const FOUNDING_YEAR = /\s+(?:18|19|20)\d{2}(?=\s|$)/
const REGISTERED_SUFFIX = /\s+e\.\s?V\.?$/i

/**
 * Shorten a club name used as location to the place name,
 * e.g. "Tennis-Club Waiblingen e.V." → "Waiblingen", "TSV Korb 1897 e.V." → "Korb".
 * Locations that don't look like club names are returned unchanged.
 */
export function formatLocationName(location: string): string {
  const short = location
    .trim()
    .replace(REGISTERED_SUFFIX, '')
    .replace(FOUNDING_YEAR, '')
    .replace(CLUB_PREFIX, '')
    .trim()
  return short || location
}
