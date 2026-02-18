---
lang: en
---

# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

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
