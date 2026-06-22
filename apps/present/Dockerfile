# syntax=docker.io/docker/dockerfile:1

FROM node:25-alpine AS base

RUN --mount=type=cache,target=/var/cache/apk \
    apk add curl tzdata

ENV TZ=Europe/Berlin

RUN npm install -g --force corepack && \
    corepack enable pnpm

FROM base AS deps
RUN --mount=type=cache,target=/var/cache/apk \
    apk add libc6-compat python3 make g++ sqlite-dev
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/calendar/package.json ./packages/calendar/
COPY packages/ebusy/package.json ./packages/ebusy/
COPY packages/email/package.json ./packages/email/
COPY apps/website/package.json ./apps/website/
COPY apps/tv/package.json ./apps/tv/
COPY apps/dispo/package.json ./apps/dispo/
COPY apps/present/package.json ./apps/present/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm rebuild better-sqlite3

FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./

COPY packages/config ./packages/config
COPY apps/present ./apps/present

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/present
RUN --mount=type=cache,target=/app/apps/present/.next/cache \
    pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/present/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/present/.next/static ./apps/present/.next/static

RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME ["/data"]

USER nextjs
WORKDIR /app/apps/present

EXPOSE 3003
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"
ENV PRESENT_DB_PATH=/data/present.db

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-3003}/api/health" >/dev/null || exit 1

CMD ["node", "server.js"]
