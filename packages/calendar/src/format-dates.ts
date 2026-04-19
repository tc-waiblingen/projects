const NBSP_EN_DASH = '\u202F\u2013\u202F'

/** One inclusive run of consecutive days. */
export interface DateRun {
  start: Date
  end: Date
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isConsecutive(prev: Date, next: Date): boolean {
  const expected = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1)
  return sameDay(expected, next)
}

/**
 * Group dates into runs of consecutive calendar days.
 * Sorts and dedupes first; each returned run's `start`/`end` are inclusive.
 */
export function buildTournamentDateRuns(dates: Date[]): DateRun[] {
  const sorted = dates
    .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    .sort((a, b) => a.getTime() - b.getTime())
  const deduped: Date[] = []
  for (const d of sorted) {
    if (deduped.length === 0 || !sameDay(deduped[deduped.length - 1]!, d)) {
      deduped.push(d)
    }
  }
  const runs: DateRun[] = []
  for (const d of deduped) {
    const last = runs[runs.length - 1]
    if (last && isConsecutive(last.end, d)) {
      last.end = d
    } else {
      runs.push({ start: d, end: d })
    }
  }
  return runs
}

function formatRun(run: DateRun, includeYear: boolean, dash: string): string {
  const startDay = run.start.getDate()
  const startMonth = run.start.getMonth() + 1
  const endDay = run.end.getDate()
  const endMonth = run.end.getMonth() + 1
  const year = run.end.getFullYear()
  const yearSuffix = includeYear ? `${year}` : ''

  if (sameDay(run.start, run.end)) {
    return `${startDay}.${startMonth}.${yearSuffix}`
  }

  if (startMonth === endMonth) {
    return `${startDay}.${dash}${endDay}.${endMonth}.${yearSuffix}`
  }

  return `${startDay}.${startMonth}.${dash}${endDay}.${endMonth}.${yearSuffix}`
}

export interface FormatPlayDatesOptions {
  /** Use narrow-NBSP + en-dash (no spaces) instead of spaced en-dash. */
  compact?: boolean
}

/**
 * Format a list of play dates as grouped consecutive runs.
 *
 * Examples:
 *   [Feb 21, Feb 22]                                       → "21.–22.2.2026"
 *   [Feb 21, Feb 22, Feb 28, Mar 1, Mar 7, Mar 8]          → "21.–22.2., 28.2.–1.3., 7.–8.3.2026"
 *   [Feb 23]                                               → "23.2.2026"
 *
 * Only the last run carries the year.
 */
export function formatTournamentPlayDates(
  dates: Date[],
  options: FormatPlayDatesOptions = {},
): string {
  if (dates.length === 0) return ''
  const dash = options.compact ? NBSP_EN_DASH : ' – '
  const runs = buildTournamentDateRuns(dates)
  return runs
    .map((run, i) => formatRun(run, i === runs.length - 1, dash))
    .join(', ')
}
