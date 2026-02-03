/**
 * Determines if a match has been played based on result and report URL.
 *
 * A match is considered NOT played if:
 * - The score is "0:0" (template/placeholder value)
 * - OR the reportUrl contains "Vorlage" (template report)
 *
 * @param result - The match result string (e.g., "6:3" or "0:0")
 * @param reportUrl - The URL to the match report
 * @returns true if the match has been played, false otherwise
 */
export function isMatchPlayed(
  result: string | undefined,
  reportUrl: string | undefined
): boolean {
  // Check for placeholder score
  if (result === '0:0') {
    return false
  }

  // Check for template report URL
  if (reportUrl && reportUrl.includes('Vorlage')) {
    return false
  }

  return true
}
