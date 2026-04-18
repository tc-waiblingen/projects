# Dispo Admin Home — Assignment Status Diagonal Split

## Context

The admin home (`apps/dispo/src/app/page.tsx`) shows a year-wide calendar where each day with home matches or tournaments is rendered as a colored pill. The color reflects **court demand** (heat-map of courts needed vs. available), and a superscript shows `am+pm` courts or `T` for tournament days.

This spec adds a second dimension of information to each day cell: whether the operator has already made enough court assignments for that day. The two dimensions share the cell via a diagonal split.

## Data model

### Source of truth

- **Courts needed per match:** derived from `@tcw/calendar` — `getCourtCount(meta.group || meta.leagueFull || meta.league)` (either 2 or 3).
- **Courts assigned per match:** count of rows in the SQLite `assignments` table for that `(match_id)`.
- Evaluation is **per match**, not aggregate per day.

### Assignment status derivation

For a day with N home-match events (ignore tournaments — see edge cases):

- `none` — sum of assigned across all matches on the day is 0
- `partial` — at least one match is short (`assigned < needed`), and total assigned > 0
- `exact` — every match has `assigned == needed`
- `over` — every match has `assigned >= needed` AND at least one has `assigned > needed`

Tournament days and days with zero home matches do not get a status half.

### Server-side fetching

In `page.tsx`:

1. After the existing `Promise.all`, also query the database once for the current year's assignments, grouped by `(match_id)`: `SELECT match_id, COUNT(*) as count FROM assignments WHERE match_date BETWEEN ? AND ? GROUP BY match_id`.
2. Build a `Map<matchId, assignedCount>`.
3. Pass the map into `CourtUsageClient`.

The client component walks `events` (already has match metadata) to combine `needed` (from `getCourtCount`) with `assigned` (from the map) and produces a `Map<dateKey, AssignmentStatus>` keyed by day.

## Visual design

### Diagonal split

Replace the single-color pill in `CourtUsageGrid` with a CSS `linear-gradient` split. Direction: bottom-left → top-right.

```css
background: linear-gradient(
  to top right,
  var(--usage-color) 0 49.5%,
  rgba(0, 0, 0, 0.35) 49.5% 50.5%,
  var(--status-color) 50.5% 100%
);
```

The thin dark band between the two halves is the separator line.

### Cell structure

- Bottom-left triangle = **usage heat** (existing `HEAT_COLORS`: green-900/80, amber-900/80, red-900/80).
- Top-right triangle = **assignment status**:
  - `none` → `red-900/80` (same red as high usage)
  - `partial` → `orange-800/80`
  - `exact` → `green-800/80`
  - `over` → `emerald-500/70` (lighter green)
- Day number stays centered, unchanged text color.
- Superscript (entries or `T`) stays at `-right-3 -top-2`, unchanged.

If no status applies (tournament day, or day with no home matches, or courts-unavailable mode), the cell renders as today with the existing flat background (no split).

### Legend

`CourtUsageClient` already renders a legend row. Extend it with a second row (or second group) describing the assignment colors, only shown when `courtsUnavailable` is false:

- red = keine Plätze zugewiesen
- orange = nicht genug zugewiesen
- grün = genau passend
- hellgrün = mehr als nötig

## Edge cases

1. **Day with match A (needs 3, assigned 4) and match B (needs 2, assigned 1):** per-match rule → B is short → `partial`.
2. **Tournament days:** no status half; pill stays single-color red/neutral as today.
3. **Days with zero home matches and no tournament:** no pill at all (unchanged).
4. **`courtsUnavailable` neutral mode:** no status half (needed count is unreliable without court counts).
5. **Past dates:** status is still shown — the operator may want to see historical completeness at a glance. No special styling for past.

## Architecture

### New file

- `apps/dispo/src/lib/assignment-status.ts` — pure function taking `(events, assignedByMatch) → Map<dateKey, AssignmentStatus>`. Unit-tested in isolation.

### Changed files

- `apps/dispo/src/lib/assignments.ts` — add `getAssignmentCountsByMatchForYear(db, year)` returning `Map<matchId, number>`.
- `apps/dispo/src/app/page.tsx` — fetch the map, pass down.
- `apps/dispo/src/components/calendar/CourtUsageClient.tsx` — accept `assignmentsByMatch: Map<string, number>`, compute `statusByDate`, pass to grid, extend legend.
- `apps/dispo/src/components/calendar/CourtUsageGrid.tsx` — accept `statusByDate?: Map<string, AssignmentStatus>`, render the diagonal split when a status is present.

### Types

```ts
export type AssignmentStatus = 'none' | 'partial' | 'exact' | 'over'
```

Lives in `apps/dispo/src/lib/assignment-status.ts`.

## Testing

- `assignment-status.test.ts` — covers: all-zero → `none`; every-match-exact → `exact`; one short + one over → `partial`; one over + rest exact → `over`; tournament-only day → no entry; mixed match+tournament day → no entry (tournament wins).
- `assignments.test.ts` — covers `getAssignmentCountsByMatchForYear` with multi-year fixtures, ensures only current year counted.
- No new component tests (visual).

## Out of scope

- Per-match indicator drilldown (the `/day/[date]` page already surfaces match-level assignment state).
- Historical trend / completeness metrics.
- Highlighting overdue-unassigned days in a separate list.
