---
lang: en
---

## Project Overview

Website for TC Waiblingen (tc-waiblingen.de) built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4. Content is managed via Directus headless CMS.

## Development Commands

- `npm run dev` — Start development server (localhost:3000)
- `npm run build` — Production build (must complete without errors)
- `npm run lint` — Run ESLint (must pass before finishing work)
- `npm run test` — Run tests once
- `npm run test:watch` — Run tests in watch mode
- `npm run test:coverage` — Run tests with coverage report
- `npm run generate:types` — Generate TypeScript types from Directus schema

## Testing

The project uses Vitest with Testing Library for unit and integration tests.

### Test File Location

Tests are colocated with source files using `__tests__` directories:

```
src/lib/
├── signing.ts
├── sanitize.ts
├── __tests__/
│   ├── signing.test.ts
│   └── sanitize.test.ts
└── validation/
    ├── form-validation.ts
    └── __tests__/
        └── form-validation.test.ts
```

### Naming Convention

- Test files: `*.test.ts` or `*.test.tsx`
- Test directories: `__tests__/`

### Writing Tests

```typescript
import { describe, expect, it } from 'vitest'
import { myFunction } from '../my-module'

describe('myFunction', () => {
  it('does something expected', () => {
    expect(myFunction('input')).toBe('output')
  })
})
```

For tests that need environment variables:

```typescript
import { beforeEach, afterEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('MY_VAR', 'test-value')
})

afterEach(() => {
  vi.unstubAllEnvs()
})
```

### What to Test

**Priority 1 — Pure utility functions:**
- `src/lib/signing.ts` — URL/asset signing
- `src/lib/sanitize.ts` — HTML sanitization
- `src/lib/validation/` — Form validation
- `src/lib/visibility.ts` — Content visibility logic

**Priority 2 — Data transformation:**
- Calendar helpers in `src/lib/directus/calendar-fetchers.ts`
- Link helpers in `src/lib/dynamic-link-helper.ts`

**Priority 3 — React components:**
- Block components in `src/components/blocks/`
- Use `@testing-library/react` for component tests

### Mocking

For Next.js APIs like `draftMode()`:

```typescript
vi.mock('next/headers', () => ({
  draftMode: vi.fn(() => ({ isEnabled: false })),
}))
```

For Directus fetchers, mock the entire module or use MSW for HTTP-level mocking.

## Architecture

### Data Flow
Pages are managed in Directus CMS. The flow is:
1. `src/lib/directus/fetchers.ts` — Data fetching functions (fetchPageData, fetchSiteData, etc.)
2. `src/lib/directus/directus.ts` — Directus SDK client with rate limiting and retry logic (retries network errors and 429/502/503/504 responses with exponential backoff)
3. `src/types/directus-schema.ts` — Auto-generated TypeScript types (regenerate with `npm run generate:types`)

### Page Rendering
- `src/app/[[...slug]]/page.tsx` — Dynamic catch-all route renders pages from Directus
- Pages contain blocks (modular content sections)
- `src/components/blocks/BlockRenderer.tsx` — Maps Directus block types to React components

### Block System
Each block type in Directus has a corresponding component in `src/components/blocks/`:
- BlockHero, BlockRichtext, BlockForm, BlockPosts, BlockGallery, BlockPricing, BlockAttachments, BlockTeam, BlockClubCalendar

To add a new block type:
1. Regenerate types from Directus schema
2. Create the component in `src/components/blocks/`
3. Add the case to `BlockRenderer.tsx`
4. Add visual editing support (see Visual Editing section below)

### Visual Editing
Directus visual editing allows content editors to click directly on page elements within the Directus admin panel to edit them in place.

**Core files:**
- `src/lib/visual-editing.ts` — Server-safe helper `getEditAttr()` for generating `data-directus` attributes
- `src/hooks/useVisualEditing.ts` — Client hook that handles `apply()` for the overlay UI
- `src/components/visual-editing/VisualEditingWrapper.tsx` — Wrapper component that enables visual editing on pages

**Adding visual editing to a new block:**

The `Section` component handles visual editing for `headline`, `tagline`, and `subheadline` automatically via the `editAttr` prop. Pass raw strings instead of wrapping them in `<span data-directus=...>`:

```tsx
const { id, headline, tagline, content, alignment } = data

return (
  <Section
    eyebrow={tagline}
    headline={headline}
    alignment={alignment}
    editAttr={{ collection: 'block_xxx', item: String(id) }}
  >
    {/* children */}
  </Section>
)
```

The `editAttr` prop maps: `eyebrow` → field `tagline`, `headline` → field `headline`, `subheadline` → field `subheadline`.

For other editable fields (content, images, etc.), use `getEditAttr()` directly:

```tsx
import { getEditAttr } from '@/lib/visual-editing'

<div data-directus={getEditAttr({ collection: 'block_xxx', item: String(id), fields: 'content' })}>
  <RichtextContent ... />
</div>
```

**Key points:**
- Do not manually wrap `headline`/`tagline` in `<span data-directus=...>` when using Section — use `editAttr` instead
- `getEditAttr()` is a pure function that can be called in server components
- The collection name must match the Directus collection (e.g., `block_hero`, `block_richtext`)
- Default mode is `popover`; alternatives: `modal`, `drawer`
- Enable visual editing by visiting any page with `?visual-editing=true`

### Component Organization
- `src/components/blocks/` — Page content blocks
- `src/components/sections/` — Reusable page sections (header, footer, etc.)
- `src/components/elements/` — Base UI components (Container, Heading, etc.)
- `src/components/nav/` — Navigation components
- `src/components/icons/` — SVG icon components
- `src/components/toc/` — Table of contents functionality

### ContactInfo Component
Use `src/components/elements/contact-info.tsx` to display contact information with icons.
Supported types: website, phone, email, instagram, facebook

### Navigation Dropdowns (Browser Compatibility)
`src/components/nav/nav-dropdown.tsx` uses CSS Anchor Positioning to position dropdown menus below their parent buttons. Firefox does not yet support CSS Anchor Positioning, so the component includes a JavaScript fallback:

- **Chrome/Safari**: Uses native CSS Anchor Positioning via inline styles (`positionAnchor`, `top: 'anchor(bottom)'`, etc.)
- **Firefox**: Detects lack of support via `CSS.supports('anchor-name', '--test')` and manually calculates position using `getBoundingClientRect()` when the popover opens

If modifying this component, ensure both positioning methods continue to work.

### Styling
- Tailwind CSS 4 with custom theme in `src/app/globals.css`
- Custom color palettes: `tcw-red-*`, `tcw-accent-*`, `taupe-*`
- Custom fonts: Open Sans (sans-serif), EB Garamond (serif)
- Use `clsx` for conditional class composition

### Text Colors
Use semantic text color classes for consistency:
- `text-body` — Primary body text (tcw-accent-900 / dark:tcw-accent-100)
- `text-muted` — Secondary/supporting text like descriptions, roles, bylines (tcw-accent-800 / dark:tcw-accent-200)

Do NOT use raw color classes like `text-tcw-accent-800` for body text. Use the semantic classes instead.

## Environment Variables

- `NEXT_PUBLIC_DIRECTUS_URL` — Directus CMS URL (public)
- `DIRECTUS_TOKEN` — Directus API token (server-side only)

## Code Style

- Two spaces for indentation
- No semicolons (Prettier config)
- Single quotes for strings
- ESLint & Prettier enforce consistent style
- Do not use third-party API services without asking first
- Use the `ContactInfo` component to display contact information (phone, email, website, social links). For direct phone number formatting, use `src/lib/phone-number-helper.js`
- All clickable or interactive elements must have `cursor-pointer`
- Links to external URLs (or likely external) must have `rel="noopener noreferrer nofollow"`

## Version Control

- The project uses git.
- Do not add `Co-Authored-By` lines.
