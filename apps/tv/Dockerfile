# syntax=docker.io/docker/dockerfile:1

FROM node:26.13.1-alpine AS base

RUN --mount=type=cache,target=/var/cache/apk \
    apk add curl tzdata

ENV TZ=Europe/Berlin

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
COPY packages/config/package.json ./packages/config/
COPY packages/calendar/package.json ./packages/calendar/
COPY packages/ebusy/package.json ./packages/ebusy/
COPY apps/tv/package.json ./apps/tv/

# Install dependencies (--frozen-lockfile ensures reproducible builds)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @tcw/tv...

# Rebuild the source code only when needed
FROM deps AS builder

# Copy shared package source and build it
COPY packages/config ./packages/config
COPY packages/calendar ./packages/calendar
RUN cd packages/calendar && pnpm run build
COPY packages/ebusy ./packages/ebusy
RUN cd packages/ebusy && pnpm run build

# Copy app source
COPY apps/tv ./apps/tv

# Build-time environment variables
ARG NEXT_PUBLIC_DIRECTUS_URL
ARG EBUSY_API_URL
ARG NR_API_URL
ARG NR_CLUB_ID
ARG DISPO_API_URL

ENV NEXT_PUBLIC_DIRECTUS_URL=${NEXT_PUBLIC_DIRECTUS_URL}
ENV EBUSY_API_URL=${EBUSY_API_URL}
ENV NR_API_URL=${NR_API_URL}
ENV NR_CLUB_ID=${NR_CLUB_ID}
ENV DISPO_API_URL=${DISPO_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/tv

# Build with secrets and cache mounts
RUN --mount=type=cache,target=/app/apps/tv/.next/cache \
    --mount=type=secret,id=DIRECTUS_TOKEN,required=true \
    --mount=type=secret,id=INSTAGRAM_ACCESS_TOKEN,required=true \
    --mount=type=secret,id=INSTAGRAM_USER_ID,required=true \
    --mount=type=secret,id=EBUSY_API_USER,required=true \
    --mount=type=secret,id=EBUSY_API_PASSWORD,required=true \
    --mount=type=secret,id=NR_API_TOKEN,required=true \
    : "${NEXT_PUBLIC_DIRECTUS_URL:?}" "${EBUSY_API_URL:?}" "${NR_API_URL:?}" "${NR_CLUB_ID:?}" "${DISPO_API_URL:?}" && \
    DIRECTUS_TOKEN=$(cat /run/secrets/DIRECTUS_TOKEN) \
    INSTAGRAM_ACCESS_TOKEN=$(cat /run/secrets/INSTAGRAM_ACCESS_TOKEN) \
    INSTAGRAM_USER_ID=$(cat /run/secrets/INSTAGRAM_USER_ID) \
    EBUSY_API_USER=$(cat /run/secrets/EBUSY_API_USER) \
    EBUSY_API_PASSWORD=$(cat /run/secrets/EBUSY_API_PASSWORD) \
    NR_API_TOKEN=$(cat /run/secrets/NR_API_TOKEN) \
    pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/tv/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/tv/.next/static ./apps/tv/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/tv/public ./apps/tv/public
RUN chmod -R a+rX apps/tv/public && \
    mkdir -p apps/tv/.next/cache && chown nextjs:nodejs apps/tv/.next/cache

USER nextjs

WORKDIR /app/apps/tv

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
