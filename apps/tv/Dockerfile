# syntax=docker.io/docker/dockerfile:1

FROM node:25-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install dependencies only when needed
FROM base AS deps
RUN --mount=type=cache,target=/var/cache/apk \
    apk add libc6-compat
WORKDIR /app

# Copy workspace config and lockfile from monorepo root
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package.json files for all workspace packages
COPY packages/calendar/package.json ./packages/calendar/
COPY apps/tv/package.json ./apps/tv/

# Install dependencies (--frozen-lockfile ensures reproducible builds)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/calendar/node_modules ./packages/calendar/node_modules
COPY --from=deps /app/apps/tv/node_modules ./apps/tv/node_modules

# Copy shared package source and build it
COPY packages/calendar ./packages/calendar
RUN cd packages/calendar && pnpm run build

# Copy app source
COPY apps/tv ./apps/tv

# Build-time environment variables
ARG NEXT_PUBLIC_DIRECTUS_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ENABLE_VISUAL_EDITING

ENV NEXT_PUBLIC_DIRECTUS_URL=${NEXT_PUBLIC_DIRECTUS_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_ENABLE_VISUAL_EDITING=${NEXT_PUBLIC_ENABLE_VISUAL_EDITING}
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/tv

# Build with secrets and cache mounts
RUN --mount=type=cache,target=/app/apps/tv/.next/cache \
    --mount=type=secret,id=DIRECTUS_TOKEN \
    --mount=type=secret,id=DIRECTUS_PUBLIC_TOKEN \
    --mount=type=secret,id=INSTAGRAM_ACCESS_TOKEN \
    --mount=type=secret,id=INSTAGRAM_USER_ID \
    --mount=type=secret,id=URL_SIGNING_SECRET \
    DIRECTUS_TOKEN=$(cat /run/secrets/DIRECTUS_TOKEN) \
    DIRECTUS_PUBLIC_TOKEN=$(cat /run/secrets/DIRECTUS_PUBLIC_TOKEN) \
    INSTAGRAM_ACCESS_TOKEN=$(cat /run/secrets/INSTAGRAM_ACCESS_TOKEN) \
    INSTAGRAM_USER_ID=$(cat /run/secrets/INSTAGRAM_USER_ID) \
    URL_SIGNING_SECRET=$(cat /run/secrets/URL_SIGNING_SECRET) \
    pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/tv/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/tv/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/tv/.next/static ./.next/static
RUN mkdir -p .next/cache && chown nextjs:nodejs .next/cache

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
