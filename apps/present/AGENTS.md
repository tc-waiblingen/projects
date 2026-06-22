## Project Overview

`@tcw/present` is the TCW screen-sharing presentation app. Moderators authenticate with Microsoft Entra, create presentation codes and password-protected viewer access, then share exactly one browser-native screen-share video track through a self-hosted LiveKit server. Viewers authenticate with a password only and subscribe to the moderator's screen-share track.

Same stack as the other apps: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest. Runs on port `3003`.

See the parent `AGENTS.md` for monorepo-wide conventions.

## Development Commands

- `mise run dev:present` — Dev server on http://localhost:3003
- `mise run dev:present:all` — Start local LiveKit, then the present dev server
- `mise run livekit:up` — Start local LiveKit via Docker Compose
- `mise run livekit:down` — Stop local LiveKit
- `mise run livekit:logs` — Tail local LiveKit logs
- `pnpm --filter @tcw/present preflight:health` — Fetch `/api/health`, verify readiness booleans, and write a sanitized JSON health report
- `pnpm --filter @tcw/present preflight:entra` — Verify Entra discovery and PKCE authorization URL construction for configured tenant values
- `pnpm --filter @tcw/present verify:production-evidence` — Validate production health, Entra, LiveKit endpoint, browser smoke, native-picker, and manual JSON reports
- `pnpm --filter @tcw/present smoke:local` — Run the local browser smoke test against the running app and local LiveKit
- `pnpm --filter @tcw/present smoke:local:five-viewers` — Run the smoke path with five isolated fake-screen viewers
- `pnpm --filter @tcw/present smoke:local:fake-screen` — Same smoke path with test-only fake screen media
- `pnpm --filter @tcw/present smoke:local:handout` — Create a temporary handout, decode its rendered QR image, and export it as a local PDF through Chromium
- `pnpm --filter @tcw/present smoke:local:headed` — Same real-capture smoke path in headed Chromium for macOS Screen Recording checks
- `pnpm --filter @tcw/present smoke:local:native-picker` — Open headed Chromium and wait for a manual `Start sharing`/`Change screen` click plus native picker selection
- `pnpm --filter @tcw/present smoke:local:refresh` — Verify viewer and moderator page refresh recovery with fake screen media
- `pnpm --filter @tcw/present smoke:local:secret-check` — Scan browser-visible pages, chunks, and LiveKit token responses for LiveKit credential leaks
- `pnpm --filter @tcw/present smoke:production:interactive` — Open headed Chromium, wait for Entra login, then run the five-viewer production smoke with fake screen media, secret scanning, and refresh recovery
- `pnpm --filter @tcw/present smoke:production:native-picker` — Open headed Chromium, wait for Entra login, then run the production smoke with the real browser-native picker
- `pnpm --filter @tcw/present smoke:livekit:endpoint` — Verify the configured LiveKit API endpoint, TCP fallback port, credentials, and signaling path
- `mise run check:present` — Lint, test, build

Equivalent without mise: `pnpm --filter @tcw/present dev`, `lint`, `test`, `build`.

The local smoke test launches Chromium. On macOS, the Chromium/browser app that captures the screen needs Screen Recording permission; the terminal or Codex host that launches it may also need a restart after permission changes. The default and `headed` real-capture smokes use Chromium auto-select flags so they can run unattended. The `native-picker` variant opens headed Chromium, then waits up to five minutes for a manual `Start sharing` click and native picker selection; it does the same for `Change screen`. The `fake-screen` variant verifies the LiveKit publish/subscribe media pipeline without using the OS screen picker; it does not replace the real screen-picker acceptance check. Each browser smoke writes a JSON evidence report to `.tmp/present-smoke-<code>.json` by default; override the directory with `PRESENT_SMOKE_OUTPUT_DIR`. The `handout` variant verifies local handout render, QR payload decoding from the page and exported PDF, and PDF export; it does not replace a physical QR scan.

The LiveKit endpoint smoke uses `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`. It verifies the RoomService API, credentials, reverse proxy route, valid-token LiveKit signaling WebSocket, and TCP fallback port reachability (`LIVEKIT_TCP_FALLBACK_PORT`, default `7881`). It writes `.tmp/livekit-endpoint-preflight-<room>.json` by default with only a masked API key; override with `LIVEKIT_PREFLIGHT_OUTPUT_DIR`. Real browser media and direct UDP still need the browser/network smoke checks.

The Entra preflight uses `PRESENT_PUBLIC_URL`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, and `ENTRA_CLIENT_SECRET`. It verifies Microsoft discovery metadata and the exact PKCE authorization URL, then writes `.tmp/entra-preflight-*.json` by default; override with `ENTRA_PREFLIGHT_OUTPUT_DIR`. It cannot prove client-secret validity, redirect URI registration, or app-role assignment without a real browser login. Production evidence must use the real tenant-specific Entra app values; `verify:production-evidence` rejects `common`, `organizations`, `consumers`, `{tenantid}`, `unknown`, and masked/dummy tenant or client IDs.

`/api/health` returns database, LiveKit, and auth readiness without secret values. In production, it fails when `PRESENT_PUBLIC_URL`, a strong `PRESENT_SESSION_SECRET`, required Entra app values, a tenant-specific Entra tenant, a browser-facing `https://` public URL, or a browser-facing `wss://` LiveKit URL are missing; in local development, missing Entra config does not fail health because dev auth may be used. The app may sit behind an internal HTTP proxy, but production `PRESENT_PUBLIC_URL` and `LIVEKIT_URL` must stay as the external browser-facing HTTPS/WSS values. `preflight:health` fetches the public `/api/health` endpoint and writes `.tmp/health-preflight-*.json` with only the status and sanitized readiness booleans.

The browser smoke normally uses `/api/auth/dev`. For production or staging, either set `PRESENT_SMOKE_INTERACTIVE_AUTH=1 PRESENT_SMOKE_HEADLESS=0` so the script opens Chromium and waits for Microsoft login, or pass a copied `present_session` cookie via `PRESENT_SMOKE_MODERATOR_COOKIE='present_session=...'`. The interactive production script uses fake screen media for repeatable five-viewer media-path testing. Set `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp` or `tcp` when a production network check must fail unless all moderator/viewer media paths use the expected protocol. Run `smoke:production:native-picker` when the production real browser picker itself needs acceptance coverage.

After collecting production reports, validate them together with `verify:production-evidence`. The validator expects a health preflight report, an Entra preflight report, a LiveKit endpoint report, a five-viewer fake-screen browser report, a native-picker report, and a manual evidence JSON file based on `infra/livekit/production-manual-evidence.example.json`. Automated reports must include ordered ISO `startedAt`/`completedAt`, positive `elapsedMs`, and their durable report path; endpoint paths must include the preflight room name, and browser/native smoke paths must include the presentation code. The health report must match the configured public base URL, return `200`, prove database readiness, LiveKit readiness, production auth readiness, external HTTPS public URL readiness, external WSS LiveKit URL readiness, and tenant-specific Entra readiness, and contain no secret-looking values. The manual template intentionally starts as `pending`; it must fail until real tester, timestamp, browser-version, physical QR expected/scanned URL, and network evidence values are entered. The endpoint report must match the configured LiveKit URL/API URL and TCP fallback host/port, keep the API key masked, and contain no token or secret-looking fields. Pass `--tcp-fallback-port <port>` only if production does not use the default `7881`. Manual notes must not contain placeholders, passwords, session cookies, tokens, or secret-looking values. Browser report validation requires `--protocol udp` or `--protocol tcp` so the report proves the requested media path, requires `pickerMode: auto` for the five-viewer fake-screen smoke, and requires headed mode when the report claims interactive Entra auth. Browser and native-picker reports must also prove viewers waited before live and that the viewer token route rejected pre-live access. The validator fails unless production browser reports use interactive Entra auth by default; pass `--allow-cookie-auth` only when the moderator session was copied from a real Entra login. The `--allow-dev-auth` override is limited to local base URLs. For both the five-viewer browser report and the native-picker report, it also requires the moderator and viewer token-route LiveKit URLs to match `--livekit-url`, plus `secretValueMarkersScanned >= 1`; pass the production LiveKit secret through `PRESENT_SMOKE_SECRET_SCAN_VALUE` so the reports prove the actual secret value was included in the browser-visible leak scan without writing that value to disk.

## Environment

Copy `.env.example` to `.env` and fill in:

- `PRESENT_PUBLIC_URL` — external public URL used for QR handouts and redirects
- `PRESENT_DB_PATH` — defaults to `./data/present.db`
- `PRESENT_SESSION_SECRET` — random 32+ bytes; signs moderator and viewer JWT cookies
- `PRESENT_DEV_AUTH` — optional local-only moderator shortcut (`1` enables `/api/auth/dev`, ignored in production)
- `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` — Microsoft Entra app registration
- `ENTRA_ADMIN_ROLE` — Entra app role mapped to `admin`, defaults to `Present.Admin`
- `ENTRA_MODERATOR_ROLE` — Entra app role mapped to `moderator`, defaults to `Present.Moderator`
- `LIVEKIT_URL` — external browser-facing LiveKit websocket URL, `ws://localhost:7880` locally and `wss://live.tc-waiblingen.de` in production
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — server-side LiveKit credentials
- `LIVEKIT_ROOM_PREFIX` — defaults to `tcw-present`

Server-side room API calls derive `http/https` from `LIVEKIT_URL`; keep `LIVEKIT_URL` as the browser-facing `ws/wss` URL.

## Architecture

- `src/proxy.ts` protects moderator pages and mutating APIs with the moderator session cookie.
- `src/lib/auth.ts` signs moderator/admin sessions.
- `/api/auth/dev` can create a local moderator session only when `PRESENT_DEV_AUTH=1` and `NODE_ENV` is not `production`.
- `src/lib/viewer-auth.ts` signs anonymous viewer sessions scoped by presentation ID/code.
- `src/lib/entra.ts` implements Microsoft Entra OIDC with PKCE.
- `src/lib/db.ts` owns SQLite schema setup.
- `src/lib/presentations.ts` owns presentation CRUD and lifecycle events.
- `src/lib/livekit.ts` creates screen-share-only moderator tokens and subscribe-only viewer tokens.
- `/presentations/*` implements the Design 03 access flow.
- `/moderator/[code]` implements the Design 01 control room.
- `/p/[code]` and `/p/[code]/watch` implement password-only viewer access.

## Constraints

- The app is screen-only: no microphone, no camera, no participant video, no chat, no viewer publishing.
- The browser-native screen picker cannot be replaced by app UI. `Change screen` reopens the browser picker.
- Viewer passwords are stored only as argon2id hashes. The handout page provides a print-time password field instead of storing plaintext.
- TURN/coturn is intentionally out of scope for the current deployment. Production uses direct UDP media ports and LiveKit TCP fallback; do not add TURN env vars or ports unless that scope changes.
