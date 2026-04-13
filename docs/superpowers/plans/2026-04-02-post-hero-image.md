# Post Hero Image: Adaptive Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PostHeroImage render wide images with focal-point-aware cover crop and non-wide images with a blurred background wash + contained sharp foreground.

**Architecture:** Classify images by aspect ratio (threshold 16:9). Wide images keep cover crop but shift `object-position` to Directus focal point. Non-wide images render two layers: a blurred/brightened background and a sharp contained foreground. All data comes from existing Directus fields already in the schema.

**Tech Stack:** Next.js Image, Tailwind CSS 4, Directus file fields

**Spec:** `docs/superpowers/specs/2026-04-02-post-hero-image-design.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/website/src/lib/directus/fetchers.ts:6` | Modify | Add focal point fields to `DIRECTUS_FILE_FIELDS` |
| `apps/website/src/app/news/[...params]/page.tsx:172-193` | Modify | Rewrite `PostHeroImage` with dual-mode rendering |

---

### Task 1: Add focal point fields to Directus fetcher

**Files:**
- Modify: `apps/website/src/lib/directus/fetchers.ts:6`

- [ ] **Step 1: Update DIRECTUS_FILE_FIELDS**

In `apps/website/src/lib/directus/fetchers.ts`, change line 6 from:

```ts
const DIRECTUS_FILE_FIELDS = ["id", "filename_disk", "filename_download", "title", "description", "type", "width", "height"] as const
```

to:

```ts
const DIRECTUS_FILE_FIELDS = ["id", "filename_disk", "filename_download", "title", "description", "type", "width", "height", "focal_point_x", "focal_point_y"] as const
```

These fields already exist on the `DirectusFile` interface in `src/types/directus-schema.ts:863-864` — no type changes needed.

- [ ] **Step 2: Verify build**

Run from `apps/website`:
```bash
npm run build
```
Expected: Compiles without errors. The new fields are optional (`number | null`) so no downstream code breaks.

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/lib/directus/fetchers.ts
git commit -m "feat(website): add focal point fields to Directus file fetcher"
```

---

### Task 2: Rewrite PostHeroImage with dual-mode rendering

**Files:**
- Modify: `apps/website/src/app/news/[...params]/page.tsx:172-193`

- [ ] **Step 1: Replace the PostHeroImage function**

In `apps/website/src/app/news/[...params]/page.tsx`, replace the entire `PostHeroImage` function (lines 172-193) with:

```tsx
const WIDE_THRESHOLD = 16 / 9

function getObjectPosition(file: DirectusFile): string | undefined {
  if (
    file.focal_point_x != null &&
    file.focal_point_y != null &&
    file.width &&
    file.height
  ) {
    const x = (file.focal_point_x / file.width) * 100
    const y = (file.focal_point_y / file.height) * 100
    return `${x.toFixed(1)}% ${y.toFixed(1)}%`
  }
  return undefined
}

function isWideImage(file: DirectusFile): boolean {
  if (!file.width || !file.height) return true // fallback: treat as wide (current behavior)
  return file.width / file.height >= WIDE_THRESHOLD
}

function PostHeroImage({ file }: { file: DirectusFile }) {
  if (!file.id) {
    return null
  }

  const src = `/api/images/${file.id}`
  const title = file.title ?? ""
  const alt = file.description ?? ""
  const objectPosition = getObjectPosition(file)

  if (isWideImage(file)) {
    return (
      <div className="relative h-64 w-full sm:h-80 lg:h-96">
        <Image
          src={src}
          title={title}
          alt={alt}
          fill
          className="object-cover"
          style={objectPosition ? { objectPosition } : undefined}
          priority
        />
      </div>
    )
  }

  return (
    <div className="relative h-64 w-full overflow-hidden sm:h-80 lg:h-96">
      {/* Blurred background wash */}
      <Image
        src={src}
        alt=""
        fill
        className="scale-[1.2] object-cover brightness-150 blur-[30px] saturate-50 dark:brightness-[.7]"
        aria-hidden
      />
      {/* Sharp foreground */}
      <Image
        src={src}
        title={title}
        alt={alt}
        fill
        className="object-contain drop-shadow-xl"
        style={objectPosition ? { objectPosition } : undefined}
        priority
      />
    </div>
  )
}
```

Key points:
- `isWideImage` defaults to `true` (current behavior) when dimensions are missing
- `getObjectPosition` returns `undefined` when focal point is not set, so `style` prop is omitted and default `center` applies
- Background image has `alt=""` and `aria-hidden` since it's decorative
- Background uses Tailwind 4 classes: `scale-120`, `brightness-150`, `saturate-50`, `blur-[30px]`, with `dark:brightness-70` for dark mode
- Foreground uses `drop-shadow-xl` for depth separation

- [ ] **Step 2: Verify Tailwind classes exist**

Confirm the Tailwind 4 utility classes are valid. In Tailwind 4:
- `scale-[1.2]` → `scale: 1.2` ✓ (arbitrary value)
- `brightness-150` → `filter: brightness(1.5)` ✓
- `saturate-50` → `filter: saturate(0.5)` ✓
- `blur-[30px]` → `filter: blur(30px)` ✓ (arbitrary value)
- `dark:brightness-[.7]` → dark mode brightness override ✓ (arbitrary value)
- `drop-shadow-xl` → drop shadow ✓

If any class doesn't generate the expected CSS (check via browser devtools after step 3), fall back to inline `style` for that property.

- [ ] **Step 3: Run build and lint**

Run from `apps/website`:
```bash
npm run build && npm run lint
```
Expected: Both pass without errors.

- [ ] **Step 4: Manual verification with dev server**

Run from `apps/website`:
```bash
npm run dev
```

Test cases:
1. Open a news post with a wide/landscape hero image → should look the same as before (cover crop), with focal-point positioning if the image has a focal point set in Directus
2. Open a news post with a portrait or square hero image → should show blurred light background wash with the sharp image contained and centered
3. Toggle dark mode → the blur background should darken (brightness-70) instead of lighten
4. Resize the browser window → check mobile, tablet, desktop breakpoints all look correct

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/app/news/[...params]/page.tsx
git commit -m "feat(website): adaptive post hero image with focal point and blur background"
```
