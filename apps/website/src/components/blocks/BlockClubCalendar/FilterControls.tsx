'use client'

import { clsx } from 'clsx/lite'
import { Toggle } from '@/components/elements/toggle'
import { ICalButton } from './ICalButton'

export type CategoryFilter = 'all' | 'matches' | 'tournaments' | 'club' | 'beginners' | 'children'

export interface TeamEntry {
  value: string        // teamId — used for filtering
  label: string        // team.name — displayed in dropdown
  season?: string      // used for optgroup label
  seasonSort: number   // optgroup sort key (descending)
}

interface FilterControlsProps {
  futureOnly: boolean
  onFutureOnlyChange: (value: boolean) => void
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
  team: string | null
  onTeamChange: (value: string | null) => void
  teamEntries: TeamEntry[]
}

const categories: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'matches', label: 'Punktspiele' },
  { value: 'tournaments', label: 'Turniere' },
  { value: 'club', label: 'Vereinstermine' },
  { value: 'beginners', label: 'Für Einsteiger' },
]

export function FilterControls({
  futureOnly,
  onFutureOnlyChange,
  category,
  onCategoryChange,
  team,
  onTeamChange,
  teamEntries,
}: FilterControlsProps) {
  // Group teams by season label. seasonSort on the first entry determines optgroup order.
  const seasons = new Map<string, { seasonSort: number; entries: TeamEntry[] }>()
  for (const entry of teamEntries) {
    const key = entry.season ?? ''
    const bucket = seasons.get(key)
    if (bucket) {
      bucket.entries.push(entry)
    } else {
      seasons.set(key, { seasonSort: entry.seasonSort, entries: [entry] })
    }
  }
  const sortedSeasons = Array.from(seasons.entries()).sort(
    (a, b) => b[1].seasonSort - a[1].seasonSort,
  )
  for (const [, bucket] of sortedSeasons) {
    bucket.entries.sort((a, b) => a.label.localeCompare(b.label, 'de'))
  }

  return (
    <div className="mb-6 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 md:sticky md:top-(--scroll-padding-top) md:z-20 md:-mx-4 md:bg-taupe-100 md:px-4 md:py-3 md:dark:bg-taupe-900">
      <Toggle
        label="Nur zukünftige Termine"
        checked={futureOnly}
        onChange={onFutureOnlyChange}
      />

      <div className="inline-flex rounded-full bg-taupe-200 p-0.5 dark:bg-taupe-700">
        {categories.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onCategoryChange(value)}
            className={clsx(
              'cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              category === value
                ? 'bg-white text-taupe-900 shadow-sm dark:bg-taupe-800 dark:text-white'
                : 'text-taupe-700 hover:text-taupe-900 dark:text-taupe-300 dark:hover:text-white',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {teamEntries.length > 0 && (
        <div className="inline-flex rounded-full bg-taupe-200 p-0.5 dark:bg-taupe-700">
          <select
            value={team ?? ''}
            onChange={(e) => onTeamChange(e.target.value || null)}
            className="cursor-pointer appearance-none rounded-full bg-transparent px-2.5 py-1 pr-7 text-xs font-medium text-taupe-700 transition-colors hover:text-taupe-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-taupe-200 dark:hover:text-white"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23787264' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.4rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1rem 1rem' }}
          >
            <option value="">Mannschaft wählen...</option>
            {sortedSeasons.length === 1 && !sortedSeasons[0]?.[0]
              ? sortedSeasons[0]![1].entries.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))
              : sortedSeasons.map(([season, bucket]) => (
                  <optgroup key={season || '(ohne Saison)'} label={season || 'Sonstige'}>
                    {bucket.entries.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </optgroup>
                ))
            }
          </select>
        </div>
      )}

      <ICalButton category={category} team={team} />
    </div>
  )
}
