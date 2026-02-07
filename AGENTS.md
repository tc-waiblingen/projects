---
lang: en
---

# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

This monorepo contains:
- **apps/website** — Main club website (Next.js 16, React 19, TypeScript, Tailwind CSS 4)
- **apps/tv** — TV kiosk display application (same stack)
- **packages/calendar** — Shared calendar library for Directus data fetching/grouping

Content is managed via Directus headless CMS.

## Development Commands

```bash
# Start development servers
pnpm run dev:website    # Website on localhost:3000
pnpm run dev:tv         # TV app on localhost:3001

# Build, lint, test (all apps via Turbo)
pnpm run build
pnpm run lint
pnpm run test

# Target specific app
pnpm --filter @tcw/website dev
pnpm --filter @tcw/tv build
pnpm --filter @tcw/calendar build

# App-specific commands (run from app directory)
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
npm run generate:types   # Regenerate Directus types
```

## Monorepo Structure

- **pnpm** (9.15.4) for package management with workspaces
- **Turbo** for build orchestration — `build` tasks depend on `^build` (packages first)
- Package scopes: `@tcw/website`, `@tcw/tv`, `@tcw/calendar`

**Important:** Shared packages (e.g., `@tcw/calendar`) must be rebuilt after making changes for apps to pick up the updates:
```bash
pnpm --filter @tcw/calendar build
```
The apps import from the compiled `dist/` folder, not the source files directly.

## App-Specific Documentation

Each app has detailed documentation in its `AGENTS.md` file covering architecture, testing patterns, visual editing, component organization, and code standards:
- `apps/website/AGENTS.md`
- `apps/tv/AGENTS.md`

## Code Style

- No semicolons, single quotes (Prettier)
- Two-space indentation
- `clsx` for conditional classes
- Semantic text colors: `text-body`, `text-muted` (not raw color classes)
- All interactive elements need `cursor-pointer`
- External links need `rel="noopener noreferrer nofollow"`

## Version Control

- Do not add `Co-Authored-By` lines to commits
- Follow (Conventional Commits)[https://www.conventionalcommits.org/en/v1.0.0/] when writing commit messages.
