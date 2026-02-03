/**
 * Shared date utility functions for TV display.
 */

/**
 * Parse an ISO date string into a Date object.
 * @param isoString - ISO date string
 * @returns Parsed date or null if invalid
 */
export function parseIsoDate(isoString: string | null | undefined): Date | null {
  if (!isoString) {
    return null
  }
  const date = new Date(isoString)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Parse a date string in YYYY-MM-DD format into a Date object.
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Parsed date or null if invalid
 */
export function toLocalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) {
    return null
  }
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }
  return new Date(Date.parse(dateString))
}

/**
 * Get a German relative date text (e.g., "heute", "morgen", "vor 3 Tagen").
 * @param date - The date to compare
 * @param today - The reference date (usually today)
 * @returns Relative date text or null if date is invalid
 */
export function getRelativeDateText(date: Date | null, today: Date): string | null {
  if (!date) {
    return null
  }

  // Normalize both dates to midnight for day comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffMs = dateOnly.getTime() - todayOnly.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'heute'
  if (diffDays === -1) return 'gestern'
  if (diffDays === -2) return 'vorgestern'
  if (diffDays === 1) return 'morgen'
  if (diffDays === 2) return 'übermorgen'

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    return `vor ${absDays} Tagen`
  }

  return `in ${diffDays} Tagen`
}

/**
 * Format a time range for display.
 * @param options - Time range options
 * @returns Formatted time range or null
 */
export function formatTimeRange({
  startTime,
  endTime,
  isAllDay,
  isMultiDay,
}: {
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
  isMultiDay?: boolean
}): string | null {
  if (isAllDay) {
    return isMultiDay ? 'Mehrtägig' : 'Ganztägig'
  }
  if (startTime && endTime) {
    return `${startTime} – ${endTime} Uhr`
  }
  if (startTime) {
    return `${startTime} Uhr`
  }
  return null
}

/**
 * Format a date for German locale display.
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateDE(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('de-DE', options)
}
