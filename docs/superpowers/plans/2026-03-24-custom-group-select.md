# Custom GroupSelect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native `<select>` in calendar filter controls with a custom Headless UI Listbox dropdown that shows season grouping with team counts and district metadata.

**Architecture:** A new `GroupSelect` client component wraps `@headlessui/react` Listbox. It receives `GroupEntry[]` and renders season-grouped options with visual hierarchy. `FilterControls` delegates group selection entirely to this component.

**Tech Stack:** React 19, Headless UI v2 (Listbox), Tailwind CSS 4, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-24-custom-group-select-design.md`

---

## File Structure

| File | Role |
|------|------|
| `apps/website/src/components/blocks/BlockClubCalendar/GroupSelect.tsx` | **Create** — Headless UI Listbox wrapper with season grouping, animation, responsive positioning |
| `apps/website/src/components/blocks/BlockClubCalendar/__tests__/GroupSelect.test.tsx` | **Create** — Tests for rendering, selection, reset, season grouping, edge cases |
| `apps/website/src/components/blocks/BlockClubCalendar/FilterControls.tsx` | **Modify** — Remove native select + season sorting, add GroupSelect + relative positioning |
| `apps/website/src/components/blocks/BlockClubCalendar/index.tsx` | **Modify** — Extend `extractGroupEntries` to include separate `league` and `district` fields on GroupEntry |

---

### Task 1: Extend GroupEntry with league and district fields

The spec requires displaying team name and district as separate elements (`Herren 50 · Württemberg`). Currently `GroupEntry.label` is a pre-formatted string like `"Herren 50 (Bezirk)"`. We need separate fields while keeping `label` for backward compatibility.

**Files:**
- Modify: `apps/website/src/components/blocks/BlockClubCalendar/FilterControls.tsx:9-13`
- Modify: `apps/website/src/components/blocks/BlockClubCalendar/index.tsx:24-41`

- [ ] **Step 1: Add `league` and `district` fields to GroupEntry**

In `FilterControls.tsx`, update the `GroupEntry` interface:

```typescript
export interface GroupEntry {
  value: string      // leagueFull || league — used for filtering
  label: string      // "{league} ({district})" — displayed in trigger button
  league: string     // league name only — displayed in dropdown options
  district?: string  // district name — displayed as secondary text
  season?: string    // used for season grouping
}
```

- [ ] **Step 2: Update extractGroupEntries to populate new fields**

In `index.tsx`, update the `extractGroupEntries` function. Change line 35 from:

```typescript
seen.set(key, { value: league, label, season: meta.season })
```

to:

```typescript
seen.set(key, {
  value: league,
  label,
  league: meta.leagueFull || meta.league!,
  district: meta.district ?? undefined,
  season: meta.season,
})
```

- [ ] **Step 3: Verify build passes**

Run: `cd apps/website && npx tsc --noEmit`
Expected: No type errors. Existing consumers of `GroupEntry` use `.value`, `.label`, and `.season` which are unchanged.

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/components/blocks/BlockClubCalendar/FilterControls.tsx apps/website/src/components/blocks/BlockClubCalendar/index.tsx
git commit -m "feat(calendar): extend GroupEntry with league and district fields"
```

---

### Task 2: Write GroupSelect tests

**Files:**
- Create: `apps/website/src/components/blocks/BlockClubCalendar/__tests__/GroupSelect.test.tsx`

- [ ] **Step 1: Write test file with all test cases**

```typescript
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupSelect } from '../GroupSelect'
import type { GroupEntry } from '../FilterControls'

const entries: GroupEntry[] = [
  { value: 'Herren 50', label: 'Herren 50 (Württemberg)', league: 'Herren 50', district: 'Württemberg', season: 'Sommer 2025' },
  { value: 'Herren 40', label: 'Herren 40 (Bezirk)', league: 'Herren 40', district: 'Bezirk', season: 'Sommer 2025' },
  { value: 'Damen', label: 'Damen (Württemberg)', league: 'Damen', district: 'Württemberg', season: 'Sommer 2025' },
  { value: 'Herren 50 Winter', label: 'Herren 50 (Bezirk)', league: 'Herren 50', district: 'Bezirk', season: 'Winter 2024/25' },
  { value: 'Junioren U14', label: 'Junioren U14 (Bezirk)', league: 'Junioren U14', district: 'Bezirk', season: 'Winter 2024/25' },
]

describe('GroupSelect', () => {
  it('renders trigger with placeholder when no value selected', () => {
    render(<GroupSelect value={null} onChange={() => {}} groupEntries={entries} />)
    expect(screen.getByRole('button', { name: /Gruppe\/Mannschaft wählen/i })).toBeInTheDocument()
  })

  it('renders trigger with selected entry label', () => {
    render(<GroupSelect value="Herren 50" onChange={() => {}} groupEntries={entries} />)
    expect(screen.getByRole('button', { name: /Herren 50/i })).toBeInTheDocument()
  })

  it('opens dropdown and shows season headers with team counts', async () => {
    const user = userEvent.setup()
    render(<GroupSelect value={null} onChange={() => {}} groupEntries={entries} />)

    await user.click(screen.getByRole('button'))

    const sommer = screen.getByText('Sommer 2025')
    expect(sommer).toBeInTheDocument()
    // Count badge is a sibling within the same season header row
    expect(sommer.closest('[aria-hidden]')?.textContent).toContain('3')

    const winter = screen.getByText('Winter 2024/25')
    expect(winter).toBeInTheDocument()
    expect(winter.closest('[aria-hidden]')?.textContent).toContain('2')
  })

  it('shows team options with district text', async () => {
    const user = userEvent.setup()
    render(<GroupSelect value={null} onChange={() => {}} groupEntries={entries} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText(/Württemberg/)).toBeInTheDocument()
    expect(screen.getByText(/Bezirk/)).toBeInTheDocument()
  })

  it('calls onChange with value when option is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupSelect value={null} onChange={onChange} groupEntries={entries} />)

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('option', { name: /Herren 40/i }))

    expect(onChange).toHaveBeenCalledWith('Herren 40')
  })

  it('calls onChange with null when "Alle anzeigen" is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<GroupSelect value="Herren 50" onChange={onChange} groupEntries={entries} />)

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('option', { name: /Alle anzeigen/i }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('renders flat list without season headers for single unnamed season', async () => {
    const flatEntries: GroupEntry[] = [
      { value: 'Herren 50', label: 'Herren 50 (Bezirk)', league: 'Herren 50', district: 'Bezirk' },
      { value: 'Damen', label: 'Damen (Württemberg)', league: 'Damen', district: 'Württemberg' },
    ]
    const user = userEvent.setup()
    render(<GroupSelect value={null} onChange={() => {}} groupEntries={flatEntries} />)

    await user.click(screen.getByRole('button'))

    // Options should be present
    expect(screen.getByRole('option', { name: /Herren 50/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Damen/i })).toBeInTheDocument()
    // No season header elements (they use aria-hidden)
    expect(screen.queryByText('Sonstige')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/website && npx vitest run src/components/blocks/BlockClubCalendar/__tests__/GroupSelect.test.tsx`
Expected: FAIL — `GroupSelect` module not found.

- [ ] **Step 3: Commit test file**

```bash
git add apps/website/src/components/blocks/BlockClubCalendar/__tests__/GroupSelect.test.tsx
git commit -m "test(calendar): add GroupSelect component tests"
```

---

### Task 3: Implement GroupSelect component

**Files:**
- Create: `apps/website/src/components/blocks/BlockClubCalendar/GroupSelect.tsx`

**Docs to check:**
- Headless UI Listbox: https://headlessui.com/react/listbox
- Spec: `docs/superpowers/specs/2026-03-24-custom-group-select-design.md`

- [ ] **Step 1: Create GroupSelect.tsx**

```tsx
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
    sortedSeasons.length > 1 || (sortedSeasons.length === 1 && sortedSeasons[0][0] !== '')

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
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd apps/website && npx vitest run src/components/blocks/BlockClubCalendar/__tests__/GroupSelect.test.tsx`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/blocks/BlockClubCalendar/GroupSelect.tsx
git commit -m "feat(calendar): add GroupSelect component with Headless UI Listbox"
```

---

### Task 4: Integrate GroupSelect into FilterControls

**Files:**
- Modify: `apps/website/src/components/blocks/BlockClubCalendar/FilterControls.tsx`

- [ ] **Step 1: Replace native select with GroupSelect**

In `FilterControls.tsx`:

1. Add import at top:
```typescript
import { GroupSelect } from './GroupSelect'
```

2. Remove the season sorting logic (lines 42-58 — the `seasons` Map, `seasonSortKey` function, and `sortedSeasons`).

3. Add `relative` to the outer div's className (line 61):
```typescript
<div className="relative mb-6 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 md:sticky md:top-(--scroll-padding-top) md:z-20 md:-mx-4 md:bg-taupe-100 md:px-4 md:py-3 md:dark:bg-taupe-900">
```

4. Replace the native select block (lines 86-113) with:
```tsx
{groupEntries.length > 0 && (
  <GroupSelect
    value={group}
    onChange={onGroupChange}
    groupEntries={groupEntries}
  />
)}
```

- [ ] **Step 2: Run type check**

Run: `cd apps/website && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run all calendar block tests**

Run: `cd apps/website && npx vitest run src/components/blocks/BlockClubCalendar/`
Expected: All tests PASS (both GroupSelect and EventList tests).

- [ ] **Step 4: Run lint**

Run: `cd apps/website && npm run lint`
Expected: No lint errors.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/components/blocks/BlockClubCalendar/FilterControls.tsx
git commit -m "feat(calendar): replace native select with GroupSelect in FilterControls"
```

---

### Task 5: Visual verification and build check

- [ ] **Step 1: Run production build**

Run: `cd /Users/ts/Developer/TCW/projects && pnpm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Manual visual check**

Run: `cd /Users/ts/Developer/TCW/projects && pnpm run dev:website`

Open the calendar page, verify:
- Trigger pill matches the style of the category filter pills
- Clicking opens the dropdown with fade-in animation
- Season headers show with team count badges
- Teams show indented with `· district` text
- Clicking a team selects it and closes the dropdown with fade-out
- "Alle anzeigen" resets the selection
- Clicking outside closes the dropdown
- Dark mode renders correctly
- On narrow viewport, dropdown uses available width appropriately

- [ ] **Step 3: Final commit if any visual tweaks needed**

Only if adjustments are required from manual testing.
