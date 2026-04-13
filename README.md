# Tennis-Club Waiblingen

Monorepo for the Tennis-Club Waiblingen website, TV kiosk, and shared packages.

## What's inside

| Path                | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `apps/website`      | Main club website (tc-waiblingen.de)                     |
| `apps/tv`           | TV kiosk display — results, schedule, team, sponsors     |
| `packages/calendar` | Shared Directus calendar/event fetching and grouping     |
| `packages/email`    | Shared email parsing utilities                           |

## Tech stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Directus (headless CMS) via `@directus/sdk`
- Turbo + pnpm workspaces
- Vitest + Testing Library

## Prerequisites

- Node.js (current LTS)
- pnpm 10.33+
- Access to a Directus instance (tokens required)

## Getting started

```bash
pnpm install

# Fill in the required values in each .env
cp apps/website/.env.example apps/website/.env
cp apps/tv/.env.example apps/tv/.env

pnpm run dev:website   # http://localhost:3000
pnpm run dev:tv        # http://localhost:3001
```

## Common commands

```bash
pnpm run build         # Build everything
pnpm run lint          # Lint all apps
pnpm run test          # Run tests across the monorepo

# Target a single workspace
pnpm --filter @tcw/website dev
pnpm --filter @tcw/tv build
pnpm --filter @tcw/calendar build
```

Shared packages (`@tcw/calendar`, `@tcw/email`) are consumed from their compiled `dist/` output. After changing a package, rebuild it so the apps pick up the update:

```bash
pnpm --filter @tcw/calendar build
```

## Documentation

Architecture, testing patterns, code style, and contribution guidelines live in `AGENTS.md` files:

- [`AGENTS.md`](./AGENTS.md) — repo-wide conventions
- [`apps/website/AGENTS.md`](./apps/website/AGENTS.md) — website architecture
- [`apps/tv/AGENTS.md`](./apps/tv/AGENTS.md) — TV kiosk architecture

## License

MIT — see [`LICENSE`](./LICENSE).
