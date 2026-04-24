# Dispo — Mobile Experience

Design for a full-parity mobile experience for `apps/dispo`. Operators must be
able to do the whole match-to-court workflow — assign, edit, resolve conflicts,
save — on a phone without falling back to desktop.

## Context

The desktop app works well: a two-pane layout (match list + canvas) with two
canvas modes ("Spalten" vertical timeline and "Lageplan" map), drag-and-drop
court assignment, hover previews, click-to-toggle chips, auto-save every 400 ms.
All of that lives in `src/components/dispo/DispoApp.tsx` (393 lines of state,
memos, handlers, and layout) plus per-view child components.

None of the desktop affordances translate cleanly to touch: drag is awkward on
phones, hover does not exist, column widths assume >1024 px, the map SVG needs
real screen space.

## Goals

- Operators can plan a full day from a phone. Not a fallback "glance and fix"
  tool — the canonical workflow works there.
- Desktop experience is unchanged. Zero behavioural regression.
- State logic has **one** implementation shared by desktop and mobile. Actions
  (toggle court, move court, update assignment, auto-save) live in a single
  hook.
- No flash of wrong layout on SSR hydration.

## Non-goals

- PWA install, service worker, offline mode.
- Drag-and-drop on touch.
- Tablet-specific layout (tablets get the desktop shell; revisit later).
- Landscape-specific optimisation (portrait first; landscape just flows).
- URL-persisted tab/sub-view state (ephemeral local state is fine).
- A dedicated `/m` mobile route.
- Map (Lageplan) view on mobile.
- Multi-match bulk actions.

## Approach

### Render strategy — two shells, CSS swap

`DispoApp.tsx` shrinks to a thin coordinator. All existing state, memos,
effects, and handlers move into a hook `useDispoState`. Two shell components —
`DesktopShell` and `MobileShell` — both mount on every render; Tailwind `md:`
(≥768 px) decides which is visible:

```tsx
const state = useDispoState(props)
return (
  <div className="dispo-root ...">
    <div className="hidden md:contents"><DesktopShell {...state} /></div>
    <div className="contents md:hidden"><MobileShell {...state} /></div>
  </div>
)
```

`display: contents` keeps both wrappers from introducing extra grid/flex
parents that would break the existing layout.

**Why CSS swap, not JS branching:** server has no viewport. A JS branch would
either flash on hydration or require a fragile user-agent negotiation. CSS swap
makes server and client render the same tree; only visibility differs. Cost is
two DOM subtrees mounted simultaneously — acceptable because mobile has no SVG
lageplan and desktop has no bottom sheet, so the inactive subtree is modest.

**Breakpoint:** 768 px (Tailwind `md`). Below → mobile. At/above → desktop.

### The shared hook — `useDispoState`

A pure logic module. No JSX, no DOM.

**Input**
```ts
interface UseDispoStateInput {
  date: string
  courts: DispoCourt[]
  matches: DispoMatch[]
  initialAssignments: DispoAssignment[]
  recentChangeMatchIds: string[]
  bookingsByCourt: BookingsByCourt
}
```

**Return**
```ts
interface DispoState {
  // data (pass-through + derived maps)
  courts: DispoCourt[]
  matches: DispoMatch[]
  bookings: Map<number, CourtBooking[]>
  recentChangeIds: Set<string>
  matchGroupById: Map<string, string>

  // user state
  assignments: DispoAssignment[]
  selectedId: string | null
  cursorMinutes: number
  nowMinutes: number | null

  // derived
  occupancy: OccupancyMap
  conflicts: PlanConflict[]
  issues: Issue[]
  highlightCourtIds: number[]

  // persistence
  saving: boolean
  saveError: string | null
  savedAt: number | null

  // actions (stable identities)
  selectMatch: (id: string) => void
  clearSelection: () => void
  toggleCourt: (courtId: number) => void
  dropMatchOnCourt: (matchId: string, courtId: number) => void
  moveAssignmentCourt: (matchId: string, from: number, to: number) => void
  removeCourtFromAssignment: (matchId: string, courtId: number) => void
  updateAssignment: (matchId: string, patch: Partial<DispoAssignment>) => void
  setCursorMinutes: (n: number) => void
  resetAssignments: () => void
}
```

`draggingMatchId` and drag handlers are **not** in the shared contract — they
are desktop-only and live inside `DesktopShell`. The auto-save effect
(400 ms debounce, first-run skip, `POST /api/assignments`) moves into the hook
unchanged; it is viewport-agnostic. `useNowMinutesForDate` also folds in.

### File layout

```
src/components/dispo/
  useDispoState.ts          NEW — the hook + internal helpers
  DispoApp.tsx              SHRUNK — coordinator (~30 lines)
  dispo.css                 SHARED — both shells
  CourtPicker.tsx           SHARED — chip UI used by both editors

  desktop/
    DesktopShell.tsx        NEW — composes Header/Sidebar/MapView/VerticalTimeline
    Header.tsx              moved (content unchanged)
    Sidebar.tsx             moved
    MapView.tsx             moved
    VerticalTimeline.tsx    moved
    TimeSlider.tsx          moved
    Legend.tsx              moved
    DetailsPanel.tsx        moved

  mobile/
    MobileShell.tsx         NEW
    MobileTopBar.tsx        NEW
    MobileMatchList.tsx     NEW
    MobileEditorSheet.tsx   NEW
    MobilePlanView.tsx      NEW — wraps sub-toggle + the two plan modes
    MobilePlanColumns.tsx   NEW
    MobilePlanStrips.tsx    NEW

  types.ts                  SHARED
```

`CourtPicker.tsx` stays shared — both shells use the same chip UI in their
editors. All desktop-only selectors in `dispo.css` must stay rooted under a
desktop wrapper class so they are inert on the mobile subtree.

## Mobile shell — composition

```
┌──────────────────────────────────────┐
│  MobileTopBar       (sticky, 56 px)  │
├──────────────────────────────────────┤
│  MobileTabs         (sticky, 40 px)  │   Spiele | Plan
├──────────────────────────────────────┤
│  tab === 'spiele' → MobileMatchList  │
│  tab === 'plan'   → MobilePlanView   │   sub-toggle: Spalten | Streifen
└──────────────────────────────────────┘
  Portal:
  selectedId !== null → <MobileEditorSheet />
```

### MobileTopBar
- Left: date with chevrons `‹ Sa 02. Mai 2026 ›`. Chevrons navigate
  `/day/[date]`. Tapping the date opens the existing `DatePickerPopover`.
- Middle-right: issues pill (green "Alles stimmig" / red "N Hinweise"). Tap
  opens a dropdown listing issues; tapping an issue switches to `Spiele` and
  calls `selectMatch(issue.matchId)`.
- Far right: save-status icon only (spinner / check / error). Verbose text does
  not fit; detail via tap/tooltip.

### MobileTabs
Two-segment control, local state, default `Spiele`.

### MobileMatchList
- Vertical scroll of `MatchCard`s. Reuse the existing card; it renders at
  narrow widths already. No drag, no drag handlers.
- Tap card → `selectMatch(id)` → editor sheet opens.
- Single footer button: "Alle Zuordnungen zurücksetzen".

### MobileEditorSheet
Portal-rooted dialog, partial-height bottom sheet. Open when `selectedId` is
set. Top-to-bottom:

1. Grab handle + header: home **bold** vs. away, group/league eyebrow, close button.
2. Start time — native `<input type="time">`.
3. Duration stepper `− 5.5 h +` (reuse `.duration-control` CSS).
4. "Plätze" label + `N / min–max` count badge.
5. Halle chip row (indoor courts).
6. Außen chip row (outdoor courts).
7. Conflicts for this match (red rows).
8. Bookings overlapping this match's time window (info rows).

Dismiss: swipe down, tap backdrop, tap close, Escape. Dismiss calls
`clearSelection()`.

Chip taps call `toggleCourt(courtId)` — same action as desktop, same auto-save
path.

### MobilePlanView
Wraps a sub-toggle `Spalten | Streifen` and renders one of:

**MobilePlanColumns** — the desktop vertical timeline, adapted:
- Column width 78 → 56 px.
- Horizontal scroll through courts; indoor/outdoor gap preserved.
- Time cursor and now-line preserved.
- Tap block → `selectMatch(id)`. **No drag, no resize, no hover preview.**
- Implement as a separate component rather than adding conditional branches
  to the existing `VerticalTimeline`.

**MobilePlanStrips** — new:
- One horizontal bar per court, stacked vertically.
- X-axis is time from `DAY_START` to `DAY_END`; shared hour-tick header.
- eBuSy bookings as hatched segments; matches as colored segments (group
  colour). Overlaps stack with slight offset and red outline.
- Tap segment → `selectMatch(id)`.

Both plan views are **view-only**. Editing is always the bottom sheet.

## Key flows

**Assigning a fresh match**
Spiele → tap card → sheet opens → tap chips → auto-save (400 ms debounce) →
count badge goes from red to green → swipe down.

**Reassigning a court**
Sheet → chip off (remove) → chip on (add). Two taps. Auto-save.

**Catching a conflict**
Top-bar issues pill → dropdown → tap issue row → Spiele tab + sheet open on
offending match → adjust → save.

**Visual scan**
Plan tab → Streifen sub-view → spot overlap (red outline) → tap segment → sheet.

**Next/prev day**
Top-bar chevron → route change → fresh fetch, sheet state resets (matches
desktop mental model).

## Edge cases

- Native time picker handles keyboards.
- Body scroll locks while sheet is open; backdrop captures taps.
- Rotation: layouts flex; sheet stays bottom-anchored.
- Match count per day is small (≤ ~12); no virtualisation needed.
- Many courts: Spalten scrolls horizontally; Streifen stacks.
- Viewport resize across 768 px: CSS swap is live, no state loss (both shells
  consume the same hook state).

## Testing

- **`useDispoState` unit tests.** The big win — logic is now isolated and
  testable. Cover each action (toggle with/without existing assignment,
  removal that empties an assignment, conflict detection, issue derivation,
  auto-save debounce, first-run skip).
- **Shell smoke tests.** Each shell mounts without error given a realistic
  `DispoState`.
- **Mobile component unit tests.**
  - `MobileEditorSheet` — chip toggles call the right action; swipe/close
    calls `clearSelection`.
  - `MobilePlanStrips` — blocks render at correct X offsets; tap opens editor.
  - `MobileTopBar` — issues pill opens dropdown; chevrons navigate.
- **Hydration parity.** `useDispoState` produces identical initial state from
  the same props — no non-deterministic work in the sync path.
- **Manual browser test** (required before shipping). Dev server on 3002,
  DevTools resize 375 ↔ 1280, verify CSS swap. Test on a real phone: the
  whole Flow A through Flow E walkthrough.

## Risks / watch-outs

1. **Bundle size** — two shells in one bundle. Start without dynamic import;
   revisit only if profiling shows mobile paying for desktop code meaningfully.
2. **Effect scope** — hook effects run once regardless of visible shell
   (intentional). Shell-local effects must not assume DOM exists; avoid
   `useLayoutEffect` against refs, prefer `useEffect` with null guards.
3. **CSS leakage** — `dispo.css` is global. Desktop-only selectors (e.g.
   `.sidebar { grid-template-columns: 340px 1fr }`) must sit under a desktop
   wrapper class so the mobile shell is unaffected. Mobile-only selectors
   similarly scoped.

## AGENTS.md updates

Add a subsection under `apps/dispo/AGENTS.md` → Architecture:

- **Mobile shell.** `useDispoState` is the single source of truth for
  assignment state; both `DesktopShell` and `MobileShell` consume it. Tailwind
  `md:` (768 px) selects which shell is visible; both always mount. Desktop-only
  concerns (drag, hover preview, resize, map SVG) stay in `desktop/`; mobile-only
  concerns (bottom sheet, strip view, tab bar) stay in `mobile/`. When adding a
  new state action, extend `useDispoState` rather than either shell.
- **Risks when touching either shell.** See the risks/watch-outs above: bundle
  size, hook effect scope, CSS leakage.

## Milestones (rough sequencing, for the implementation plan)

1. Extract `useDispoState` from `DispoApp.tsx`; existing desktop tree untouched
   except imports. Behaviour identical, verified by existing tests and manual
   walkthrough.
2. Move desktop components into `desktop/` and introduce `DesktopShell`.
   Still no mobile yet.
3. Add `MobileShell`, `MobileTopBar`, `MobileTabs`, `MobileMatchList`,
   `MobileEditorSheet`. CSS swap wiring at 768 px.
4. Add `MobilePlanColumns`, `MobilePlanStrips`, `MobilePlanView`.
5. `AGENTS.md` update. Manual test pass on a real phone.

Each step leaves the app shippable.
