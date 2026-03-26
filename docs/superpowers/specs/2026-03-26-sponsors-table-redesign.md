# Sponsors Table Redesign — Magazine / Editorial Style

## Context

The `BlockSponsors` "table" style currently uses raw HTML `<table>` markup with a two-column layout (fixed 208px logo column + content column). The layout feels cramped, visually unpolished, and doesn't adapt well to different screen sizes. This redesign replaces it with an editorial-style layout using flexbox.

## Design

### Layout: D1 — Horizontal, Airy

Each sponsor renders as a horizontal row with:
- **Logo** (left): `w-[180px] h-[72px]`, `rounded`, `object-contain`. Linked to `sponsor.website` if available. Placeholder if no logo.
- **Content** (right): Flows vertically:
  1. **Name**: EB Garamond (serif), ~19px, normal weight, `text-body` color
  2. **Description** (optional): 14px, `text-muted`, 1.5 line-height
  3. **Contact footer**: Single line, 12px, muted color for address, `tcw-red` for links. Items separated by ` · ` (middle dot with en-spaces). Renders: address, then each available contact (phone, email, website, instagram, facebook) using the existing `ContactInfo` component.

Rows separated by `divide-y` with `divide-tcw-accent-100 dark:divide-tcw-accent-800`.

Gap between logo and content: `gap-7` (~28px).

Container: `max-w-3xl mx-auto` (wider than current `max-w-2xl` to give the editorial layout room to breathe).

### Mobile (below `sm` breakpoint)

Logo stacks above the content:
- Layout switches from `flex-row` to `flex-col` via `sm:flex-row`
- Logo keeps its width but is no longer constrained to side-by-side
- Contact footer wraps naturally across lines

### Edge Cases

- **No logo**: Render placeholder `div` with `bg-tcw-accent-100 dark:bg-tcw-accent-800 rounded`
- **No description**: Omit, name flows directly to contact footer (with reduced top margin on footer)
- **No contact info at all**: Just show name + description
- **Single contact field**: Render without dot separator

### Contact Footer

The contact footer replaces the current stacked `<p>` per-contact pattern with an inline flow. Reuse `ContactInfo` component for each link, but render them inline (flex row, wrapping) with `·` separators between items. Address is plain text (not a ContactInfo), rendered first.

## Files to Modify

- `apps/website/src/components/blocks/BlockSponsors.tsx` — Replace `SponsorsTable` and `SponsorTableRow` components. Remove `SponsorTableLogo` (its logic folds into the new row component).

## What Stays the Same

- `TableView` wrapper, `Section` integration, `editAttr` handling — unchanged
- `CardsView`, `SitePlanView`, `SponsorTableLogo` pattern of linking logo to website — preserved in new layout
- Data fetching, filtering, null-check early returns — unchanged

## Verification

1. `npm run build` — no errors
2. `npm run lint` — passes
3. Visual check at `/sponsoren` (or wherever the table style is used) with `?visual-editing=true`
4. Check with sponsors that have: all fields populated, no logo, no description, no contact info, only one contact field
5. Check mobile viewport (< 640px) — logo should stack above text
