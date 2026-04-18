# syntax=docker.io/docker/dockerfile:1

FROM node:25-alpine AS base

RUN --mount=type=cache,target=/var/cache/apk \
    apk add curl

# Install Corepack and download and install pnpm
RUN npm install -g --force corepack && \
    corepack enable pnpm

# Install dependencies only when needed
FROM base AS deps
RUN --mount=type=cache,target=/var/cache/apk \
    apk add libc6-compat python3 make g++ sqlite-dev
WORKDIR /app

# Copy workspace config and lockfile from monorepo root
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package.json files for all workspace packages
COPY packages/calendar/package.json ./packages/calendar/
COPY packages/email/package.json ./packages/email/
COPY apps/dispo/package.json ./apps/dispo/

# Install dependencies (skip ignored builds for unrelated packages)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Make sure better-sqlite3's native binding is built against this image's Node
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm rebuild better-sqlite3

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./

# Copy shared package source and build it
COPY packages/calendar ./packages/calendar
RUN cd packages/calendar && pnpm run build

# Copy app source
COPY apps/dispo ./apps/dispo

# Build-time env (only public vars need to be present at build time)
ARG NEXT_PUBLIC_DIRECTUS_URL
ENV NEXT_PUBLIC_DIRECTUS_URL=${NEXT_PUBLIC_DIRECTUS_URL}
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/dispo
RUN --mount=type=cache,target=/app/apps/dispo/.next/cache \
    pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/dispo/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dispo/.next/static ./apps/dispo/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/dispo/public ./apps/dispo/public

# Persistent SQLite data volume
RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME ["/data"]

USER nextjs
WORKDIR /app/apps/dispo

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"
ENV DISPO_DB_PATH=/data/dispo.db

CMD ["node", "server.js"]
