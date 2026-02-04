# syntax=docker.io/docker/dockerfile:1

FROM node:25-alpine AS base

# Install Corepack and download and install pnpm
RUN npm install -g --force corepack && \
    corepack enable pnpm

# Install dependencies only when needed
FROM base AS deps
RUN --mount=type=cache,target=/var/cache/apk \
    apk add libc6-compat
WORKDIR /app

# Copy workspace config and lockfile from monorepo root
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package.json files for all workspace packages
COPY packages/calendar/package.json ./packages/calendar/
COPY apps/website/package.json ./apps/website/

# Install dependencies
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/calendar/node_modules ./packages/calendar/node_modules
COPY --from=deps /app/apps/website/node_modules ./apps/website/node_modules

# Copy shared package source and build it
COPY packages/calendar ./packages/calendar
RUN cd packages/calendar && pnpm run build

# Copy app source
COPY apps/website ./apps/website

# Build-time environment variables
ARG NEXT_PUBLIC_DIRECTUS_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ENABLE_VISUAL_EDITING

ENV NEXT_PUBLIC_DIRECTUS_URL=${NEXT_PUBLIC_DIRECTUS_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_ENABLE_VISUAL_EDITING=${NEXT_PUBLIC_ENABLE_VISUAL_EDITING}
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/website

# Build with secrets and cache mounts
RUN --mount=type=cache,target=/app/apps/website/.next/cache \
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

COPY --from=builder /app/apps/website/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/website/.next/static ./.next/static
RUN mkdir -p .next/cache && chown nextjs:nodejs .next/cache

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
