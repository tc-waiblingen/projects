# Blocks Use Section Component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BlockRichtext, BlockButtonGroupBlock, BlockAttachments, and BlockForm render via the shared `<Section>` element instead of raw `<section>` tags or dedicated document section components.

**Architecture:** Each block switches to `<Section>` for its outer shell (section + Container + headline area). `<Section>` is not modified. All blocks adopt Section's standard styling (`gap-2`, `py-8`, `Subheading`). BlockRichtext passes `<Document>` as a child of Section for prose content.

**Tech Stack:** React, TypeScript, Tailwind CSS 4

---

## File Structure

- **Modify:** `apps/website/src/components/blocks/BlockAttachments.tsx` — use Section
- **Modify:** `apps/website/src/components/blocks/BlockButtonGroupBlock.tsx` — use Section
- **Modify:** `apps/website/src/components/blocks/BlockForm.tsx` — use Section
- **Modify:** `apps/website/src/components/blocks/BlockRichtext.tsx` — use Section + Document

No changes to `section.tsx`, `document-centered.tsx`, or `document-left-aligned.tsx`.

---

### Task 1: Migrate BlockAttachments

**Files:**
- Modify: `apps/website/src/components/blocks/BlockAttachments.tsx`

BlockAttachments already uses `Eyebrow` + `Subheading` with the same pattern as Section. Remove the manual header markup and let Section handle it.

- [ ] **Step 1: Replace manual section/container/header with Section**

```tsx
import type { BlockAttachment as BlockAttachmentType, DirectusFile } from '@/types/directus-schema'
import { Section } from '@/components/elements/section'
import { formatFileSize, FileIcon } from '@/lib/file-utils'
import { getEditAttr } from '@/lib/visual-editing'
import { clsx } from 'clsx/lite'

interface BlockAttachmentsProps {
  data: BlockAttachmentType
}

export function BlockAttachments({ data }: BlockAttachmentsProps) {
  const { id, headline, tagline, files, alignment } = data

  const attachmentFiles =
    files?.filter((item) => {
      if (typeof item === 'string') return false
      const file = item.directus_files_id
      return file && typeof file !== 'string' && file.id
    }) ?? []

  if (attachmentFiles.length === 0) {
    return null
  }

  const isCentered = alignment === 'center'

  const eyebrow = tagline ? (
    <span data-directus={getEditAttr({ collection: 'block_attachments', item: String(id), fields: 'tagline' })}>
      {tagline}
    </span>
  ) : undefined

  const wrappedHeadline = headline ? (
    <span data-directus={getEditAttr({ collection: 'block_attachments', item: String(id), fields: 'headline' })}>
      {headline}
    </span>
  ) : undefined

  return (
    <Section
      eyebrow={eyebrow}
      headline={wrappedHeadline}
      alignment={alignment}
    >
      <ul
        className={clsx(
          'flex flex-wrap gap-4',
          isCentered ? 'justify-center' : 'justify-start'
        )}
        data-directus={getEditAttr({ collection: 'block_attachments', item: String(id), fields: 'files' })}
      >
        {attachmentFiles.map((item) => {
          if (typeof item === 'string') return null
          const file = item.directus_files_id as DirectusFile

          return <AttachmentItem key={item.id} file={file} />
        })}
      </ul>
    </Section>
  )
}
```

Note: The `AttachmentItem` component stays unchanged. Removed imports: `Container`, `Eyebrow`, `Subheading`.

**Visual editing change:** The current code puts `data-directus` directly on the `<Eyebrow>` and `<Subheading>` components. The new code wraps the text in `<span data-directus>` and passes it as a prop to Section (same pattern as BlockGallery). Both approaches work for Directus visual editing.

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: Build passes.

- [ ] **Step 3: Commit**

```
refactor(website): migrate BlockAttachments to use Section element
```

---

### Task 2: Migrate BlockButtonGroupBlock

**Files:**
- Modify: `apps/website/src/components/blocks/BlockButtonGroupBlock.tsx`

BlockButtonGroupBlock has no headline — it only renders a button group with alignment. Section without a `headline` prop skips the header entirely and just renders children in a Container.

- [ ] **Step 1: Replace manual section/container with Section**

```tsx
import type { BlockButtonGroup } from '@/types/directus-schema'
import { Section } from '@/components/elements/section'
import { ButtonGroup } from './ButtonGroup'
import { getEditAttr } from '@/lib/visual-editing'
import { clsx } from 'clsx/lite'

interface BlockButtonGroupBlockProps {
  data: BlockButtonGroup
  currentPath?: string
}

export function BlockButtonGroupBlock({ data, currentPath }: BlockButtonGroupBlockProps) {
  const { id, alignment } = data

  return (
    <Section alignment={alignment}>
      <div
        className={clsx(
          'flex',
          alignment === 'center' ? 'justify-center' : 'justify-start'
        )}
        data-directus={getEditAttr({ collection: 'block_button_group', item: String(id), fields: 'buttons' })}
      >
        <ButtonGroup data={data} currentPath={currentPath} />
      </div>
    </Section>
  )
}
```

Removed import: `Container`.

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: Build passes.

- [ ] **Step 3: Commit**

```
refactor(website): migrate BlockButtonGroupBlock to use Section element
```

---

### Task 3: Migrate BlockForm

**Files:**
- Modify: `apps/website/src/components/blocks/BlockForm.tsx`

BlockForm already uses `Eyebrow` + `Subheading`. Replace the manual shell with Section. The `FormContent` component and everything below it stays unchanged.

Note: BlockForm currently uses `py-16` and larger gaps — these will change to Section's standard `py-8` and `gap-2` for consistency.

- [ ] **Step 1: Replace manual section/container/header with Section**

Change the `BlockForm` component function (lines 16-56). Everything below stays unchanged.

```tsx
export function BlockForm({ data }: BlockFormProps) {
  const { id, headline, tagline, form } = data

  if (!form || typeof form === 'string') {
    return null
  }

  const eyebrow = tagline ? (
    <span
      data-directus={getEditAttr({
        collection: 'block_form',
        item: String(id),
        fields: 'tagline',
      })}
    >
      {tagline}
    </span>
  ) : undefined

  const wrappedHeadline = headline ? (
    <span
      data-directus={getEditAttr({
        collection: 'block_form',
        item: String(id),
        fields: 'headline',
      })}
    >
      {headline}
    </span>
  ) : undefined

  return (
    <Section
      eyebrow={eyebrow}
      headline={wrappedHeadline}
    >
      <FormContent form={form} />
    </Section>
  )
}
```

Update imports — replace `Container`, `Eyebrow`, `Subheading` with `Section`:

```tsx
import { Section } from '@/components/elements/section'
```

Remove unused imports: `Container`, `Eyebrow`, `Subheading`, `clsx`.

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: Build passes.

- [ ] **Step 3: Commit**

```
refactor(website): migrate BlockForm to use Section element
```

---

### Task 4: Migrate BlockRichtext

**Files:**
- Modify: `apps/website/src/components/blocks/BlockRichtext.tsx`

Key changes:
- Replace `DocumentCentered`/`DocumentLeftAligned` with `<Section>`
- Wrap content in `<Document>` element directly inside Section's children slot
- Headlines switch from `Heading as="h2"` to `Subheading` (handled by Section) — minor visual change (`text-balance max-w-5xl` becomes `text-pretty`)
- Subheadline (tagline) is now passed as `eyebrow` to Section instead of rendered as `Text size="lg"`
- Adopts Section's standard `gap-2` and `py-8`

- [ ] **Step 1: Rewrite BlockRichtext to use Section**

```tsx
import type { BlockRichtext as BlockRichtextType, DirectusFile } from '@/types/directus-schema'
import { Section } from '@/components/elements/section'
import { Document } from '@/components/elements/document'
import { sanitizeHtml } from '@/lib/sanitize'
import { transformRichtextAssets } from '@/lib/transform-richtext-assets'
import { RichtextContent } from '@/components/elements/richtext-content'
import { fetchFilesByIds } from '@/lib/directus/fetchers'
import { getEditAttr } from '@/lib/visual-editing'

interface BlockRichtextProps {
  data: BlockRichtextType
}

/** Extract Directus file IDs from raw HTML content before URL transformation */
function extractDirectusFileIds(html: string): string[] {
  const regex = /https:\/\/cms\.tc-waiblingen\.de\/assets\/([\w-]+)/g
  const ids: string[] = []
  let match
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) ids.push(match[1])
  }
  return [...new Set(ids)]
}

export async function BlockRichtext({ data }: BlockRichtextProps) {
  const { id, headline, tagline, content, alignment } = data

  const fileIds = content ? extractDirectusFileIds(content) : []
  const files = await fetchFilesByIds(fileIds)
  const fileMetadata: Record<string, DirectusFile> = Object.fromEntries(
    files.map((f) => [f.id, f])
  )

  const isCentered = alignment === 'center'

  const eyebrow = tagline ? (
    <span data-directus={getEditAttr({ collection: 'block_richtext', item: String(id), fields: 'tagline' })}>
      {tagline}
    </span>
  ) : undefined

  const processedContent = content
    ? sanitizeHtml(transformRichtextAssets(content))
    : undefined

  const wrappedHeadline = headline ? (
    <span data-directus={getEditAttr({ collection: 'block_richtext', item: String(id), fields: 'headline' })}>
      {headline}
    </span>
  ) : undefined

  return (
    <Section
      eyebrow={eyebrow}
      headline={wrappedHeadline}
      alignment={alignment}
    >
      {processedContent && (
        <Document className={isCentered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
          <div data-directus={getEditAttr({ collection: 'block_richtext', item: String(id), fields: 'content' })}>
            <RichtextContent html={processedContent} fileMetadata={fileMetadata} />
          </div>
        </Document>
      )}
    </Section>
  )
}
```

Removed imports: `DocumentCentered`, `DocumentLeftAligned`.
Added imports: `Section`, `Document`.

- [ ] **Step 2: Verify build**

Run: `pnpm run build`
Expected: Build passes.

- [ ] **Step 3: Commit**

```
refactor(website): migrate BlockRichtext to use Section element
```

---

### Task 5: Final verification

- [ ] **Step 1: Full build**

Run: `pnpm run build`
Expected: Build passes with no errors.

- [ ] **Step 2: Visual check**

Run: `pnpm run dev:website`
Spot-check pages that use these blocks to verify the layout looks correct with Section's standard spacing.
