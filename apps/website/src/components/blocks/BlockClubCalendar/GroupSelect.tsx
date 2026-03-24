'use client'

import { clsx } from 'clsx/lite'
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react'
import type { GroupEntry } from './FilterControls'

interface GroupSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  groupEntries: GroupEntry[]
}

export function GroupSelect({ value, onChange, groupEntries }: GroupSelectProps) {
  const selectedEntry = groupEntries.find((e) => e.value === value)

  // Group entries by season
  const seasons = new Map<string, GroupEntry[]>()
  for (const entry of groupEntries) {
    const key = entry.season ?? ''
    if (!seasons.has(key)) seasons.set(key, [])
    seasons.get(key)!.push(entry)
  }

  // Sort newest season first; within same year, Sommer > Winter
  const seasonSortKey = (s: string): number => {
    const yearMatch = s.match(/(20\d{2})/)
    const year = yearMatch?.[1] ? parseInt(yearMatch[1]) : 0
    const isSummer = s.startsWith('Sommer')
    return -(year * 10 + (isSummer ? 1 : 0))
  }
  const sortedSeasons = Array.from(seasons.entries()).sort(
    (a, b) => seasonSortKey(a[0]) - seasonSortKey(b[0]),
  )

  // Single unnamed season = flat list, no headers
  const showSeasonHeaders =
    sortedSeasons.length > 1 || (sortedSeasons.length === 1 && sortedSeasons[0]?.[0] !== '')

  return (
    <Listbox
      value={value ?? ''}
      onChange={(v: string) => onChange(v || null)}
    >
      <ListboxButton
        className="cursor-pointer appearance-none rounded-full bg-taupe-200 px-3 py-1.5 pr-7 text-xs font-medium text-taupe-700 transition-colors hover:text-taupe-900 focus:outline-none focus:ring-2 focus:ring-taupe-400 focus:ring-offset-2 dark:bg-taupe-700 dark:text-taupe-200 dark:hover:text-white"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23787264' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 0.4rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1rem 1rem',
        }}
      >
        {selectedEntry?.label ?? 'Gruppe/Mannschaft wählen...'}
      </ListboxButton>

      <ListboxOptions
        anchor="bottom start"
        transition
        className="z-50 mt-1 min-w-64 rounded-xl bg-white p-1.5 shadow-lg transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0 data-leave:duration-75 data-leave:ease-in dark:bg-taupe-800 md:min-w-72"
      >
        <ListboxOption
          value=""
          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs italic text-taupe-500 data-focus:bg-taupe-100 dark:text-taupe-400 dark:data-focus:bg-taupe-700"
        >
          Alle anzeigen
        </ListboxOption>

        {showSeasonHeaders
          ? sortedSeasons.map(([season, seasonEntries]) => (
              <div key={season || '(none)'}>
                <hr className="my-1 border-taupe-200 dark:border-taupe-600" />
                <div
                  aria-hidden="true"
                  className="flex items-center justify-between rounded-lg bg-taupe-100 px-3 py-1.5 dark:bg-taupe-700"
                >
                  <span className="text-xs font-semibold text-taupe-900 dark:text-taupe-100">
                    {season || 'Sonstige'}
                  </span>
                  <span className="rounded-full bg-taupe-200 px-2 py-0.5 text-[10px] text-taupe-600 dark:bg-taupe-600 dark:text-taupe-300">
                    {seasonEntries.length}
                  </span>
                </div>
                {seasonEntries.map((entry) => (
                  <ListboxOption
                    key={entry.value}
                    value={entry.value}
                    className={clsx(
                      'cursor-pointer rounded-lg py-1.5 pl-6 pr-3 text-xs',
                      'text-taupe-900 data-focus:bg-taupe-100 dark:text-taupe-100 dark:data-focus:bg-taupe-700',
                    )}
                  >
                    {entry.league}
                    {entry.district && (
                      <span className="text-taupe-500 dark:text-taupe-400">
                        {' · '}
                        {entry.district}
                      </span>
                    )}
                  </ListboxOption>
                ))}
              </div>
            ))
          : groupEntries.map((entry) => (
              <ListboxOption
                key={entry.value}
                value={entry.value}
                className={clsx(
                  'cursor-pointer rounded-lg px-3 py-1.5 text-xs',
                  'text-taupe-900 data-focus:bg-taupe-100 dark:text-taupe-100 dark:data-focus:bg-taupe-700',
                )}
              >
                {entry.league}
                {entry.district && (
                  <span className="text-taupe-500 dark:text-taupe-400">
                    {' · '}
                    {entry.district}
                  </span>
                )}
              </ListboxOption>
            ))
        }
      </ListboxOptions>
    </Listbox>
  )
}
