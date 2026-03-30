# Court Usage Calendar Block Style

## Context

Club organizers need a planning tool to visualize court demand from home matches and tournaments across the season. The existing `BlockClubCalendar` supports `default` and `list` styles. This adds a third style, `court_usage`, that shows court occupancy data in a heat map grid with drill-down detail.

## Requirements

### Data Sources

- **Home matches** from NuLiga (already fetched as `CalendarEvent` with `source: 'match'`, `metadata.isHome`)
- **Home tournaments** from WTB (already fetched as `CalendarEvent` with `source: 'tournament'`)
- **Court inventory** from Directus `courts` collection (types: `tennis_indoor`, `tennis_outdoor`)

### Court Count Rules (Matches)

- League/group name contains "staffel", "kids", or "talentiade" (case-insensitive) → **2 courts**
- All other matches → **3 courts**
- The league/group name is `metadata.leagueFull || metadata.league`

### Player Count (Matches)

- 2 courts → **8 players** (4 home + 4 opponent)
- 3 courts → **12 players** (6 home + 6 opponent)

### Court Type by Season

- **Winter** (Sep 23 – Apr 30): indoor courts (`tennis_indoor`)
- **Summer** (May 1 – Sep 22): outdoor courts (`tennis_outdoor`)

### Tournament Rules

- Winter: all indoor courts occupied
- Summer: all outdoor courts occupied
- No player count data for tournaments

### AM/PM Grouping

- AM: start time before 12:00
- PM: start time 12:00 or later

### Heat Map Thresholds

Based on percentage of available courts for the current season's court type:
- **Low** (green): <33% of available courts
- **Medium** (amber): 33–66% of available courts
- **High** (red): >66% of available courts or tournament day

## Architecture

### New utility: `packages/calendar/src/court-usage.ts`

Pure function that transforms `CalendarEvent[]` + court counts into court usage data.

**Input:**
```ts
interface CourtUsageConfig {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
}
```

**Output types:**
```ts
interface CourtUsageEntry {
  time: string          // HH:MM
  courts: number        // 2 or 3
  players: number       // 8 or 12
  league: string
  teamName: string
  opponent: string
}

interface TournamentUsageEntry {
  title: string
  courts: number        // all indoor or all outdoor
}

interface CourtUsageHalf {
  courts: number
  teams: number
  players: number
  entries: CourtUsageEntry[]
}

interface CourtUsageDay {
  dateKey: string
  date: Date
  courtType: 'tennis_indoor' | 'tennis_outdoor'
  totalCourtsAvailable: number
  am: CourtUsageHalf
  pm: CourtUsageHalf
  tournament: TournamentUsageEntry | null
  heatLevel: 'low' | 'medium' | 'high'
}

interface CourtUsageMonth {
  monthKey: string
  monthDate: Date
  courtType: 'tennis_indoor' | 'tennis_outdoor'
  totalCourtsAvailable: number
  days: CourtUsageDay[]
}
```

**Exported function:**
```ts
function computeCourtUsage(config: CourtUsageConfig): CourtUsageMonth[]
```

This filters events to home matches/tournaments, computes courts/players/AM-PM, groups by month and day, and assigns heat levels.

**Helper functions (exported for testing):**
```ts
function getCourtCount(leagueName: string): number
function getPlayerCount(courts: number): number
function getSeasonCourtType(date: Date): 'tennis_indoor' | 'tennis_outdoor'
function getHeatLevel(courtsUsed: number, courtsAvailable: number): 'low' | 'medium' | 'high'
```

### Updated: `apps/website/src/types/directus-schema.ts`

Add `'court_usage'` to `BlockClubCalendar.style`:
```ts
style?: 'default' | 'list' | 'court_usage'
```

### Updated: `apps/website/src/components/blocks/BlockClubCalendar/index.tsx`

When `style === 'court_usage'`:
- Fetch courts from Directus via existing `fetchCourtsWithSponsors()`
- Count indoor/outdoor courts (filter `status === 'published'`, group by `type`)
- Render `CourtUsageClient` instead of `CalendarClient`

### New: `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageClient.tsx`

Client component managing drill-down state and toggle.

**State:**
- `view`: `'grid' | 'month' | 'day'`
- `selectedMonth`: month key or null
- `selectedDay`: date key or null
- `mode`: `'courts' | 'teams'` (toggle)

**Renders:**
- **Grid view**: All 12 months as mini calendar grids. Each month shows Mo–So header. Days with events have a colored pill (heat map) with AM+PM superscript. Month label includes court type (Halle/Freiplätze). Toggle bar for Platzbelegung / Heimmannschaften.
- **Month view**: Expanded list of all days with matches for the selected month. Same detail format as day view but for all days. Back button to grid.
- **Day view**: Full detail — day header with summary, AM/PM groups, match rows (time, courts, players, league, team, opponent), summary bar. Back button to month.

### Sub-components

- `CourtUsageGrid.tsx` — The 12-month heat map grid with toggle
- `CourtUsageMonthDetail.tsx` — Expanded month list
- `CourtUsageDayDetail.tsx` — Single day detail with AM/PM groups and summary
- `CourtUsagePrintView.tsx` — Continuous list of all months/days for printing

### Print Support

- Print button in the UI triggers `window.print()`
- `CourtUsagePrintView` renders all data as a continuous list (month headers → day headers → match rows)
- Hidden on screen (`hidden print:block`), visible only in print
- The interactive grid/detail views are hidden in print (`print:hidden`)

## Files to Create/Modify

| Action | Path |
|--------|------|
| Create | `packages/calendar/src/court-usage.ts` |
| Modify | `packages/calendar/src/index.ts` (export new module) |
| Create | `packages/calendar/src/__tests__/court-usage.test.ts` |
| Modify | `apps/website/src/types/directus-schema.ts` (add style) |
| Modify | `apps/website/src/components/blocks/BlockClubCalendar/index.tsx` |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageClient.tsx` |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageGrid.tsx` |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageMonthDetail.tsx` |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageDayDetail.tsx` |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsagePrintView.tsx` |

## Verification

1. **Unit tests** for `court-usage.ts`:
   - Court count rules (staffel → 2, kids → 2, talentiade → 2, others → 3)
   - Player count derivation (2→8, 3→12)
   - Season detection (Sep 23 = winter, Sep 22 = summer, May 1 = summer, Apr 30 = winter)
   - AM/PM grouping (11:59 = AM, 12:00 = PM)
   - Heat level thresholds
   - Tournament handling (all courts for the season)
2. **Build**: `pnpm run build` passes
3. **Lint**: `pnpm run lint` passes
4. **Dev server**: `pnpm run dev:website` — add a calendar block with `court_usage` style in Directus, verify grid renders with real data
5. **Print**: Click print button, verify continuous list output
