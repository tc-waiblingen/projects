# Custom Group/Team Select for Calendar Blocks

## Problem

The calendar block's group/team selector uses a native `<select>` element with `<optgroup>` for season grouping. The native optgroup rendering is visually poor and inconsistent across browsers. The dropdown needs better visual hierarchy for seasons and teams, with room for metadata (team counts, districts).

## Solution

Replace the native `<select>` with a custom `GroupSelect` component built on `@headlessui/react` Listbox. The component provides styled season grouping, metadata display, and consistent cross-browser appearance while maintaining full keyboard accessibility.

## Visual Design

**Trigger:** Pill-shaped button matching the existing category filter pills (`rounded-full bg-taupe-200 p-0.5`). Shows the selected team name or placeholder text "Gruppe/Mannschaft wählen..." with a chevron icon.

**Dropdown panel:** White floating panel with rounded corners and shadow (`bg-white rounded-xl shadow-lg`).

**Content structure:**
- "Alle anzeigen" reset option at top — italic, muted color
- Divider
- Per season:
  - Season header row — bold text, highlighted background (`bg-taupe-100`), right-aligned count badge (`rounded-full bg-taupe-200`, e.g. "8")
  - Team options indented beneath — team name followed by dot-separated muted district text (e.g. "Herren 50 · Württemberg")

**Animation:**
- Open: `ease-out duration-100`, fade in from `opacity-0 scale-95`
- Close: `ease-in duration-75`, fade out to `opacity-0 scale-95`

## Positioning

- **Desktop (md+):** Anchored below the trigger button using Headless UI's `anchor="bottom start"`
- **Mobile (<md):** Full-width of the filter bar container. `FilterControls` outer div gets `relative`, dropdown panel uses `left-0 right-0` absolute positioning.

## Component Structure

### New file: `GroupSelect.tsx`

Location: `apps/website/src/components/blocks/BlockClubCalendar/GroupSelect.tsx`

```
Listbox (root) — value/onChange binding
├── ListboxButton — pill trigger
└── ListboxOptions — floating dropdown panel (with transition)
    ├── ListboxOption value="" — "Alle anzeigen" reset
    ├── For each season (sorted newest first):
    │   ├── <hr> divider
    │   ├── <div> season header (not a ListboxOption, aria-hidden)
    │   └── ListboxOption × N — team options (indented)
    └── (repeats per season)
```

**Props:**
```typescript
interface GroupSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  groupEntries: GroupEntry[]
}
```

### Changes to `FilterControls.tsx`

- Remove the native `<select>` block (lines 86-113)
- Remove the season sorting logic (lines 42-58) — moves into `GroupSelect`
- Add `relative` to the outer div's className
- Render `<GroupSelect value={group} onChange={onGroupChange} groupEntries={groupEntries} />`

## Interaction & Accessibility

All managed by Headless UI Listbox:
- `role="listbox"`, `aria-expanded`, `aria-activedescendant` set automatically
- Arrow keys navigate between team options (season headers are skipped — they are not `ListboxOption`s)
- Enter/Space selects the focused option
- Escape closes the dropdown
- Click outside closes the dropdown
- Home/End jump to first/last option

Season header divs are `aria-hidden="true"` since they serve as visual grouping labels only.

The "Alle anzeigen" option uses `value=""`. The `onChange` handler maps empty string to `null` to maintain the existing API contract with `CalendarClient`.

## Dependencies

- Add `@headlessui/react` to `apps/website/package.json`
- Compatible with React 19 (peer dependency)

## Implementation Notes

**District data:** The current `GroupEntry.label` is a pre-formatted string like `"Herren 50 (Bezirk)"`. The visual design shows team name and district as separate elements (`Herren 50 · Bezirk`). To support this, `GroupEntry` should be extended with separate `league` and `district` fields alongside the existing `label` (which remains for the trigger button text). The extraction logic in `BlockClubCalendar/index.tsx` already has access to both values.

**Single season edge case:** When there's only one season with no name, render a flat list without season headers (matching current behavior).

**Dark mode:** Derive dropdown panel dark mode styles from existing conventions — `dark:bg-taupe-800` for panel background, `dark:bg-taupe-700` for season headers, `dark:text-taupe-200` for text.

## Files Changed

| File | Change |
|------|--------|
| `apps/website/package.json` | Add `@headlessui/react` dependency |
| `apps/website/src/components/blocks/BlockClubCalendar/GroupSelect.tsx` | New component |
| `apps/website/src/components/blocks/BlockClubCalendar/FilterControls.tsx` | Replace native select with GroupSelect, add relative positioning |
