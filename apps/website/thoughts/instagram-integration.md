# Instagram Block Implementation Plan

## Overview

Integrate an Instagram feed carousel block into the tc-waiblingen.de website, reusing patterns from the tv-wall project.

## Configuration (Already Done)

Environment variables already added to `.env` and `.env.example`:
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_USER_ID`
- `URL_SIGNING_SECRET` - Secret key for signing proxy URLs (generate with `npm run generate:secret`)

## New Files to Create

### 1. Instagram Library (`src/lib/instagram/`)

**`types.ts`** - TypeScript types for Instagram API responses:
- `InstagramPost` interface (id, caption, media_type, media_url, permalink, thumbnail_url, timestamp)
- `InstagramStory` interface (id, media_type, media_url, timestamp) - no caption/permalink
- `InstagramFeedItem` - union type with `type: 'post' | 'story'` discriminator
- `InstagramFeedResponse`, `InstagramStoriesResponse` interfaces

**`fetchers.ts`** - Data fetching with ISR:
- `fetchInstagramPosts(limit)` - Fetches posts from `/media` endpoint
- `fetchInstagramStories()` - Fetches stories from `/stories` endpoint (requires `instagram_manage_insights` permission)
- `fetchInstagramFeed({ limit, showPosts, showStories })` - Combines posts + stories based on Directus settings
- Uses `fetch` with `next: { revalidate: 1800 }` (30 min ISR)
- Graceful error handling (returns empty array on failure, stories fail silently if no permission)

**Note:** Uses shared signing utility at `src/lib/signing.ts` (see below)

### 2. Utility Script (`scripts/generate-signing-secret.js`)

Simple script to generate a cryptographically secure signing secret:
- Uses Node.js `crypto.randomBytes()` to generate 32 random bytes
- Outputs base64-encoded string ready to copy into `.env`
- Run with `npm run generate:secret`

### 2. Media Proxy API Route (`src/app/api/instagram/media/route.ts`)

Proxies Instagram CDN media with signature verification:
- Accepts query parameters: `url` (encoded media URL), `sig` (HMAC signature)
- Verifies signature using `verifySignature()` before fetching
- Rejects requests with invalid/missing signatures (403 Forbidden)
- Proxies the media and returns with appropriate content-type headers
- Caches responses for 30 minutes

### 3. Block Components (`src/components/blocks/BlockInstagram/`)

**`index.tsx`** - Server component:
- Fetches posts/stories based on Directus settings (limit, show_posts, show_stories)
- Generates signed proxy URLs for each media item using `signUrl()`
- Renders Section with headline/tagline from Directus
- Passes data + config (showCaptions, ctaLabel) to client component
- Returns null when no content available

**`InstagramCarousel.tsx`** - Client component:
- Horizontal scrollable carousel with CSS scroll-snap
- Navigation buttons (prev/next)
- Touch/swipe support
- "Auf Instagram ansehen" CTA link to profile

**`InstagramPost.tsx`** - Post/story card component:
- Displays media via signed proxy URL
- Visual indicators: Video icon, Carousel icon, Story badge (ring border)
- Caption overlay on hover (posts only, stories have no caption)
- Links to original post on Instagram (stories link to profile)

### 4. CSS Addition (`src/app/globals.css`)

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

## Files to Modify

### `package.json`

Add npm script:
```json
"generate:secret": "node scripts/generate-signing-secret.js"
```

### `src/components/blocks/BlockRenderer.tsx`

Add import and switch case:
```typescript
import { BlockInstagram } from "./BlockInstagram"
// ...
case "block_instagram":
  return <BlockInstagram data={item as BlockInstagramType} />
```

### Existing Proxy Routes (Add URL Signing)

Add signature verification to existing Directus asset proxy routes for consistency and security:

**`src/app/api/files/[id]/route.ts`**
- Add `sig` query parameter verification
- Sign the file ID
- Reject requests with invalid signatures

**`src/app/api/images/[id]/route.ts`**
- Add `sig` query parameter verification
- Sign the file ID + transformation params (width, height, etc.)
- Reject requests with invalid signatures

**`src/app/api/team-images/[id]/route.ts`**
- Add `sig` query parameter verification
- Sign the file ID
- Reject requests with invalid signatures

**Components that generate proxy URLs** (update to include signatures):
- `src/components/blocks/BlockAttachments/` - file downloads
- `src/components/blocks/BlockGallery/` - gallery images
- `src/components/blocks/BlockTeam/` - team member photos
- Any other components using `/api/files/`, `/api/images/`, or `/api/team-images/`

### `src/lib/signing.ts` (New shared utility)

Signing utility for use by both Instagram and Directus proxies:
- `signUrl(url: string): string` - Sign a full URL (for Instagram media)
- `signId(id: string, params?: string): string` - Sign an ID with optional params (for Directus assets)
- `verifySignature(data: string, signature: string): boolean` - Verify any signature
- Uses `URL_SIGNING_SECRET` environment variable
- Signature is HMAC-SHA256, truncated to 16 hex characters (64 bits)

## Directus Schema (Already Created)

The `block_instagram` collection has fields:
- `tagline` (string) - Small text above headline
- `headline` (string) - Main section heading
- `cta_label` (string) - CTA button text
- `limit` (number) - Max posts to show
- `show_captions` (boolean) - Show captions on hover
- `show_posts` (boolean) - Include regular posts
- `show_stories` (boolean) - Include stories

Defaults in component: limit=12, cta_label="Auf Instagram ansehen", show_captions=true, show_posts=true, show_stories=true

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data fetching | Server component + ISR | Follows BlockPosts/BlockClubCalendar pattern |
| Revalidation | 30 minutes | Fresh enough, reduces API calls |
| Media handling | Proxy API route | Instagram CDN URLs expire; proxy provides reliability |
| Proxy security | HMAC URL signing | Prevents open proxy abuse; only server-rendered URLs can be proxied |
| Carousel | Custom implementation | Matches codebase patterns, no new dependencies |

## Verification

1. Add block to a test page in Directus
2. Run `npm run dev` and verify carousel renders
3. Check media loads through proxy (Network tab)
4. Test navigation buttons and touch scrolling
5. Verify ISR works: wait 30 min or use `fetch` cache bypass
6. Run `npm run build && npm run lint` - must pass
