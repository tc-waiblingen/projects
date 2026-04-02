# Post Hero Image: Adaptive Rendering with Focal Point Support

## Context

News post hero images use a fixed-height, full-width container with `object-cover`. When the source image is portrait or square (common for event/people photography), the cover crop cuts off important content — often a person's head. Directus supports focal points and stores original dimensions, but neither is currently used in rendering.

This change makes PostHeroImage aspect-ratio-aware and focal-point-aware, so every image gets optimal treatment regardless of orientation.

## Design

### Classification

Based on the image's `width` and `height` from Directus:

- **Wide (aspect ratio ≥ 16:9 / ~1.78):** Cover crop with focal-point positioning
- **Non-wide (aspect ratio < 16:9):** Blurred background wash + contained sharp foreground

Falls back to current behavior (cover, centered) when width/height are missing.

### Wide mode (≥ 16:9)

Single `<Image>` with `fill` and `object-cover`, same container as today (`h-64 sm:h-80 lg:h-96`).

`object-position` computed from Directus focal point:
```
object-position: ${(focal_point_x / width) * 100}% ${(focal_point_y / height) * 100}%
```

Falls back to `object-position: center` when no focal point is set.

### Non-wide mode (< 16:9)

Same container dimensions. Two layers:

1. **Background layer:** `<Image>` with `fill`, `object-cover`, CSS filters:
   - Light mode: `blur(30px) scale(1.2) brightness(1.5) saturate(0.5)`
   - Dark mode: `blur(30px) scale(1.2) brightness(0.7) saturate(0.5)`
   - `scale(1.2)` prevents white/transparent edges from the blur
   - `overflow-hidden` on the container clips the scaled background

2. **Foreground layer:** `<Image>` with `fill`, `object-contain`
   - Subtle drop shadow for depth separation
   - Uses focal-point `object-position` when available

### Data changes

Add `focal_point_x` and `focal_point_y` to the `DIRECTUS_FILE_FIELDS` constant in `src/lib/directus/fetchers.ts`. This makes focal point data available wherever images are fetched. Width and height are already included.

## Files to modify

1. **`src/lib/directus/fetchers.ts`** — Add `focal_point_x`, `focal_point_y` to `DIRECTUS_FILE_FIELDS`
2. **`src/app/news/[...params]/page.tsx`** — Rewrite `PostHeroImage` component with dual-mode rendering

## Verification

1. Run `npm run build` in `apps/website` — must compile without errors
2. Run `npm run lint` in `apps/website` — must pass
3. Manual test with dev server:
   - Find a news post with a wide landscape image → should render as cover crop (same as before, but with focal point positioning if set)
   - Find or create a news post with a portrait/square image → should show blur background with contained sharp image
   - Check dark mode for both cases
   - Check responsive behavior at mobile, tablet, desktop breakpoints
