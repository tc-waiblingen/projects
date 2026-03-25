# Blockquote Styling for WYSIWYG and Rich Text Content

## Problem

Posts have WYSIWYG content and both posts and pages can have rich text blocks (`BlockRichtext`). Blockquotes in this content have no styling — they render as plain unstyled text indistinguishable from surrounding paragraphs.

## Decision

Style B — left border with subtle background fill. Provides clear visual separation for long-form quotes from external sources without being heavy-handed.

## Design

Add `[&_blockquote]` child-combinator rules to the `Document` component (`apps/website/src/components/elements/document.tsx`), following the existing pattern used for paragraphs, lists, links, headings, and other rich text elements.

### Styles

| Property | Light mode | Dark mode |
|----------|-----------|-----------|
| Border left | 3px, `tcw-accent-700` | 3px, `tcw-accent-600` |
| Background | `tcw-accent-50` | `taupe-800/50` |
| Border radius | `rounded-r-md` (right side only) | same |
| Padding | `py-5 px-6` | same |
| Bottom margin | `mb-7` (matches paragraph rhythm) | same |
| Top margin | `not-first:mt-7` (when not first child) | same |
| Inner paragraph text | `text-muted` semantic class | same (auto dark mode) |
| Last inner paragraph | `mb-0` (remove trailing space) | same |

### Color rationale

- `tcw-accent-700` border matches the existing list marker color (`[&_ul]:marker:text-tcw-accent-700`)
- `tcw-accent-50` background is the lightest accent tone — visible but subtle
- `text-muted` differentiates quoted text from body without introducing a new color

### Scope

**Single file change:** `apps/website/src/components/elements/document.tsx`

**No changes needed to:**
- `globals.css` — no new utilities or base styles required
- `richtext-content.tsx` — blockquote is a standard HTML element, no special parsing needed
- `sanitize.ts` — `blockquote` is already in the allowed tags list (content is sanitized before rendering)

### Coverage

Both content rendering paths flow through `Document`:
1. Post WYSIWYG `content` field (sanitized HTML rendered inside a `Document` wrapper)
2. `BlockRichtext` blocks (rendered via `RichtextContent` inside `DocumentLeftAligned`/`DocumentCentered`, which use `Document`)

No attribution (`<cite>`, `<footer>`) support is needed — quotes are long-form excerpts from external sources without structured attribution.
