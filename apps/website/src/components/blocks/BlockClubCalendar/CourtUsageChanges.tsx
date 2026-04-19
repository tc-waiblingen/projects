import type { MatchChangeSummaryEntry, MatchChangeSummaryGroup } from '@tcw/calendar'
import { formatRelativeDate } from '@/lib/relative-date'

interface CourtUsageChangesProps {
  groups: MatchChangeSummaryGroup[]
  now: Date
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}.${m[2]}.`
}

function formatShortTime(value: string | null | undefined): string {
  if (!value) return ''
  const m = value.match(/^(\d{2}):(\d{2})/)
  if (!m) return value
  return `${m[1]}:${m[2]}`
}

function describeChange(entry: MatchChangeSummaryEntry): string {
  switch (entry.kind) {
    case 'created':
      return 'neu angesetzt'
    case 'rescheduled-date':
      return `${formatShortDate(entry.oldValue)} → ${formatShortDate(entry.newValue)}`
    case 'rescheduled-time':
      return `${formatShortTime(entry.oldValue)} → ${formatShortTime(entry.newValue)} Uhr`
    case 'relocated':
      return entry.oldValue
        ? `Ort: ${entry.oldValue} → ${entry.newValue ?? ''}`
        : `Ort: ${entry.newValue ?? ''}`
  }
}

export function CourtUsageChanges({ groups, now }: CourtUsageChangesProps) {
  if (groups.length === 0) return null

  return (
    <div className="mt-10">
      <h3 className="mb-4 text-lg font-bold text-body">Änderungen (letzte 30 Tage)</h3>
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.dateKey}>
            <div className="mb-2 text-sm text-muted">
              {formatRelativeDate(new Date(group.dateKey), now)}
            </div>
            <ul className="rounded-lg border border-tcw-accent-200 bg-white dark:border-tcw-accent-700 dark:bg-tcw-accent-800">
              {group.entries.map((entry) => (
                <li
                  key={`${entry.matchId}-${entry.kind}-${entry.changedAt}`}
                  className="flex flex-col gap-1 border-b border-gray-100 px-4 py-2 text-sm last:border-b-0 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-baseline sm:gap-4 dark:border-gray-800"
                >
                  <span className="text-muted tabular-nums">
                    Spieltermin: {formatShortDate(entry.matchDate)}
                    {entry.matchTime && ` ${formatShortTime(entry.matchTime)}`}
                  </span>
                  <span className="text-body">
                    <span className="font-medium">{entry.teamLabel}</span>
                    {entry.opponent && (
                      <span className="text-muted"> · {entry.opponent}</span>
                    )}
                  </span>
                  <span className="text-muted tabular-nums">{describeChange(entry)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
