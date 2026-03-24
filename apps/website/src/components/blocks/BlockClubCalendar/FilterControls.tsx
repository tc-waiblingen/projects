'use client'

import { clsx } from 'clsx/lite'
import { Toggle } from '@/components/elements/toggle'
import { GroupSelect } from './GroupSelect'
import { ICalButton } from './ICalButton'

export type CategoryFilter = 'all' | 'matches' | 'tournaments' | 'club' | 'beginners' | 'children'

export interface GroupEntry {
  value: string      // leagueFull || league — used for filtering
  label: string      // "{league} ({district})" — displayed in trigger button
  league: string     // league name only — displayed in dropdown options
  district?: string  // district name — displayed as secondary text
  season?: string    // used for season grouping
}

interface FilterControlsProps {
  futureOnly: boolean
  onFutureOnlyChange: (value: boolean) => void
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
  group: string | null
  onGroupChange: (value: string | null) => void
  groupEntries: GroupEntry[]
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
  group,
  onGroupChange,
  groupEntries,
}: FilterControlsProps) {
  return (
    <div className="relative mb-6 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 md:sticky md:top-(--scroll-padding-top) md:z-20 md:-mx-4 md:bg-taupe-100 md:px-4 md:py-3 md:dark:bg-taupe-900">
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

      {groupEntries.length > 0 && (
        <GroupSelect
          value={group}
          onChange={onGroupChange}
          groupEntries={groupEntries}
        />
      )}

      <ICalButton category={category} group={group} />
    </div>
  )
}
