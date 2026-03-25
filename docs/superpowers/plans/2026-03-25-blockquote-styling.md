# Blockquote Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Style `<blockquote>` elements in WYSIWYG and rich text block content with a left border + subtle background.

**Architecture:** Add Tailwind descendant-selector rules (`[&_blockquote]`) to the existing `Document` component class string. This follows the established pattern for all other rich text element styling (paragraphs, lists, links, headings).

**Tech Stack:** Tailwind CSS 4, React/TypeScript

---

### Task 1: Add blockquote styles to Document component

**Files:**
- Modify: `apps/website/src/components/elements/document.tsx:9` (the active class string on line 9)

- [ ] **Step 1: Add blockquote rules to the class string**

Append these rules to the end of the class string on line 9 (before the closing `'`):

```
 [&_blockquote]:mb-7 [&_blockquote]:not-first:mt-7 [&_blockquote]:border-l-3 [&_blockquote]:border-tcw-accent-700 dark:[&_blockquote]:border-tcw-accent-600 [&_blockquote]:bg-tcw-accent-50 dark:[&_blockquote]:bg-taupe-800/50 [&_blockquote]:rounded-r-md [&_blockquote]:py-5 [&_blockquote]:px-6 [&_blockquote_p]:text-muted [&_blockquote_p:last-child]:mb-0
```

The full line 9 after the edit:

```typescript
        ' text-body [&_p]:mb-7 [&_a]:font-semibold [&_a]:text-tcw-accent-900 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-white [&_h1]:not-first:mt-7 [&_h2]:not-first:mt-7 [&_h3]:not-first:mt-7 [&_h1]:mb-3 [&_h2]:mb-3 [&_h3]:mb-3 [&_li]:pl-2 [&_ol]:mb-7 [&_ol]:list-decimal [&_ol]:pl-10 [&_strong]:font-semibold [&_strong]:text-tcw-accent-900 dark:[&_strong]:text-white [&_ul]:mb-7 [&_ul]:list-[square] [&_ul]:pl-10 [&_ul]:marker:text-tcw-accent-700 dark:[&_ul]:marker:text-tcw-accent-300 [&_ol]:marker:text-tcw-accent-700 dark:[&_ol]:marker:text-tcw-accent-300 [&_table_h1]:mb-0 [&_table_h1]:mt-3 [&_table_h2]:mt-3 [&_table_h3]:mt-3 [&_table_h4]:mt-3 [&_blockquote]:mb-7 [&_blockquote]:not-first:mt-7 [&_blockquote]:border-l-3 [&_blockquote]:border-tcw-accent-700 dark:[&_blockquote]:border-tcw-accent-600 [&_blockquote]:bg-tcw-accent-50 dark:[&_blockquote]:bg-taupe-800/50 [&_blockquote]:rounded-r-md [&_blockquote]:py-5 [&_blockquote]:px-6 [&_blockquote_p]:text-muted [&_blockquote_p:last-child]:mb-0',
```

- [ ] **Step 2: Verify the build succeeds**

Run: `pnpm --filter @tcw/website build`
Expected: Build completes without errors.

- [ ] **Step 3: Verify visually with dev server**

Run: `pnpm run dev:website`
Navigate to a post that contains a blockquote (or temporarily add one in Directus). Confirm:
- Left border in accent-700
- Subtle accent-50 background with rounded right corners
- Proper padding and spacing relative to surrounding paragraphs
- Paragraph text inside uses muted color
- Dark mode: border shifts to accent-600, background to taupe-800/50

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/components/elements/document.tsx
git commit -m "feat(website): add blockquote styling to rich text content"
```
