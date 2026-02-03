# Production Deployment

This project uses Docker with BuildKit secrets for secure production deployment.

## Prerequisites

- Docker with BuildKit support
- `.env` file with all required variables

## Environment Variables

Create a `.env` file in the project root with the following variables:

### Build-time Variables (NEXT_PUBLIC_*)

These are inlined into the JavaScript bundle during build:

```
NEXT_PUBLIC_DIRECTUS_URL=https://your-directus-instance.com
NEXT_PUBLIC_SITE_URL=https://tc-waiblingen.de
NEXT_PUBLIC_ENABLE_VISUAL_EDITING=false
```

### Build-time Secrets

These are used during `npm run build` to fetch content for static generation. They are mounted temporarily and not stored in the image layers:

```
DIRECTUS_TOKEN=your-directus-token
DIRECTUS_PUBLIC_TOKEN=your-public-token
INSTAGRAM_ACCESS_TOKEN=your-instagram-token
INSTAGRAM_USER_ID=your-instagram-user-id
URL_SIGNING_SECRET=your-signing-secret
```

### Runtime Variables

These are available to the running container for ISR revalidation and API routes:

```
DIRECTUS_TOKEN=your-directus-token
DIRECTUS_PUBLIC_TOKEN=your-public-token
DIRECTUS_FORM_TOKEN=your-form-token
DRAFT_MODE_SECRET=your-draft-secret
INSTAGRAM_ACCESS_TOKEN=your-instagram-token
INSTAGRAM_USER_ID=your-instagram-user-id
URL_SIGNING_SECRET=your-signing-secret
```

## Deployment

Build and start the container:

```bash
docker compose up -d --build
```

The application will be available on port 3000.

## How It Works

1. **Build phase**: Docker mounts secrets from environment variables, making them available to `npm run build` without baking them into image layers
2. **Static generation**: Next.js fetches all page content from Directus and Instagram during build, ensuring content is immediately available after deployment
3. **Runtime**: The container receives runtime environment variables for ISR revalidation and server-side operations

## Updating Content

Content updates are handled automatically through ISR (Incremental Static Regeneration). Pages revalidate based on their configured revalidation interval.

To force a full rebuild with fresh content:

```bash
docker compose up -d --build --no-cache
```
