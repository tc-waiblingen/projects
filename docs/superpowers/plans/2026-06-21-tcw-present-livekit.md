# TCW Present LiveKit Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Keep changes surgical: no production code outside the new presentation app unless the step explicitly says so.

**Goal:** Build a production-usable screen-sharing web app that combines Design 03 (`Access Flow`) for presentation setup, QR handouts, and viewer password entry with Design 01 (`Control Room`) for live moderation. Moderators authenticate with Microsoft Entra. Viewers authenticate with only a presentation password. Media runs through a self-hosted LiveKit server.

**Primary design references:**
- `docs/designs/screen-share/index.html`
- `screenshots/tcw-present-designs-desktop.png`
- `screenshots/tcw-present-designs-mobile.png`

**Chosen product shape:**
- Design 03 for `/presentations/new`, `/presentations/[code]/edit`, handout preview/export, and viewer join.
- Design 01 for `/moderator/[code]`, live room health, screen switching, QR/code visibility, and stream controls.

**Architecture:** New monorepo app `apps/present` using Next.js 16, React 19, TypeScript, Tailwind CSS 4, SQLite, `jose`, `openid-client`, `@node-rs/argon2`, `livekit-client`, `@livekit/components-react`, and `livekit-server-sdk`. The app issues LiveKit JWTs from server routes after app-level auth checks. LiveKit runs separately as a self-hosted SFU with Redis, direct UDP media ports, and TCP fallback. TURN/coturn is intentionally excluded from the current deployment.

**Assumptions:**
- First production target is a single `apps/present` web container plus one self-hosted LiveKit VM.
- SQLite is acceptable for the app database at this stage, matching `apps/dispo`. If the web app must run multiple replicas, replace SQLite with Postgres before horizontal scaling.
- Recording is not required initially. LiveKit Egress is planned as an optional follow-up because self-hosted egress is a separate service.
- Browser-native screen picker is accepted. The app can style the surrounding “Change screen” flow, but the picker itself is controlled by the browser.
- The product is screen-only: one moderator screen-share video track, no microphone, no camera, no participant video, no chat, and no viewer publishing.
- TURN is not part of the first deployment. Restricted networks that block direct UDP and LiveKit TCP fallback may fail until a relay is added later.

**LiveKit references checked on 2026-06-21:**
- Self-hosting overview: `https://docs.livekit.io/transport/self-hosting/`
- VM deployment: `https://docs.livekit.io/transport/self-hosting/vm/`
- Deployment config and firewall notes: `https://docs.livekit.io/transport/self-hosting/deployment/`
- Tokens and grants: `https://docs.livekit.io/frontends/reference/tokens-grants/`
- Endpoint token generation: `https://docs.livekit.io/frontends/build/authentication/endpoint/`
- Screen sharing: `https://docs.livekit.io/transport/media/screenshare/`
- Codecs, simulcast, Dynacast: `https://docs.livekit.io/transport/media/advanced/`
- Adaptive stream: `https://docs.livekit.io/transport/media/subscribe/`
- JS server SDK: `https://docs.livekit.io/reference/server-sdk-js/`

**Working directory:** All paths are relative to repo root unless stated. Commands run from repo root.

**Commit style:** Conventional Commits, no `Co-Authored-By`. Examples: `feat(present): ...`, `test(present): ...`, `docs(present): ...`.

**Implementation status on 2026-06-22:** `apps/present` and the TURN-free LiveKit deployment templates are implemented. Automated checks pass (`pnpm --filter @tcw/present lint`, `test`, `build`). Local LiveKit uses `livekit/livekit-server:v1.13.1`. Browser pages can join the same local room and viewer count updates through the real-capture smoke path. `pnpm --filter @tcw/present preflight:entra` verifies Microsoft discovery metadata and the generated PKCE authorization URL for configured Entra values and now writes durable JSON reports; it passed against Microsoft `common` on 2026-06-22 and wrote `.tmp/entra-preflight-unknown-0000-0000.json`, which is development evidence only because final production validation now requires tenant-specific Entra evidence. `pnpm --filter @tcw/present smoke:local:handout` passed locally on 2026-06-22 (`SMK-OUUASO`), decoding the QR image from the rendered page and from the exported PDF to the exact viewer URL. `pnpm --filter @tcw/present smoke:local:native-picker` passed locally in Chromium on 2026-06-22 (`SMK-ORLA0G`, `SMK-OUYXZE`, `SMK-OZDBM3`, `SMK-P2JZHW`, `SMK-P6211K`) with the real browser-native picker, verifying screen publish, viewer receipt, and `Change screen`; the latest rerun wrote `.tmp/present-smoke-SMK-P6211K.json`. `pnpm --filter @tcw/present smoke:local:five-viewers` passed locally again on 2026-06-22 (`SMK-PLP0L2`), verifying five isolated viewer logins before go-live, pre-live waiting/token rejection, LiveKit fan-out, viewer count, initial delivery, change-screen delivery, resolved UDP media paths for all five viewers, moderator end, viewer ended state, and fresh viewer-token rejection after end with test-only fake screen media. `pnpm --filter @tcw/present smoke:local:refresh` passed locally on 2026-06-22 (`SMK-OS5KET`), verifying viewer and moderator page refresh recovery with fake screen media. `pnpm --filter @tcw/present smoke:local:secret-check` passed locally on 2026-06-22 (`SMK-OTFFR4`), scanning browser-visible page HTML, same-origin Next chunks, and LiveKit token responses for credential leaks. `pnpm --filter @tcw/present smoke:local:fake-screen` passed locally on 2026-06-22 (`SMK-OWWNE8`) with explicit moderator/viewer media-path assertions, Stop/restart assertions, and end-of-session browser assertions after the screen-share pending-state and native-picker runner updates. The browser smoke now writes durable JSON reports to `.tmp/present-smoke-<code>.json`, supports production-style moderator auth via `PRESENT_SMOKE_INTERACTIVE_AUTH=1` for headed Entra login or `PRESENT_SMOKE_MODERATOR_COOKIE` for a copied moderator session, records pre-live viewer waiting and pre-live viewer-token rejection, records moderator/viewer token-route LiveKit URLs, records non-secret `secretCredentialMarkersScanned` / `secretValueMarkersScanned` counts, and `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp|tcp` can make production UDP/TCP checks fail unless all moderator/viewer media paths use the expected protocol; the production fake-screen script enables secret scanning, five viewers, fake media, headed interactive auth, auto picker mode, and viewer/moderator refresh recovery by default, while `pnpm --filter @tcw/present smoke:production:native-picker` covers the production real-picker path with interactive Entra login. `pnpm --filter @tcw/present verify:production-evidence` now validates the final production evidence bundle across automated report timestamp ordering and room/code-matched report paths, tenant-specific Entra preflight, LiveKit endpoint API URL/TCP fallback address/redaction hygiene, five-viewer browser smoke headed/auto mode and token-route LiveKit URL proof, pre-live viewer waiting/token rejection, real-picker smoke token-route LiveKit URL proof, actual-secret marker coverage, refresh recovery, UDP/TCP media protocol assertions, end-state token rejection, physical printed QR expected/scanned URL proof, Chromium/Safari/Firefox viewer checks, and manual network observations; the local automated browser report passed in partial/dev mode with `SMK-PMVGHI`, the passed manual fixture validates the manual schema, and the operational manual template now intentionally fails until real evidence replaces its pending placeholders. The copied-cookie branch passed locally (`SMK-OVFLML`), the UDP assertion/report path passed locally (`SMK-OXOOLX`, `.tmp/present-smoke-SMK-OXOOLX.json`, `mediaProtocolMatched: true`), the one-viewer UDP fake-screen smoke passed after viewer filtering (`SMK-PE9UFJ`, `.tmp/present-smoke-SMK-PE9UFJ.json`), the pre-live viewer waiting/token guard smoke passed with UDP media-path proof (`SMK-PF6RF7`, `.tmp/present-smoke-SMK-PF6RF7.json`, `viewerWaitingBeforeLive: true`, `viewerTokenRejectedBeforeLive: true`), and the updated combined production-style local smoke passed with five viewers, secret scanning, one secret-value marker scanned, refresh recovery, UDP assertion, elapsed-time metadata, pre-live viewer proof, and validator-accepted report output (`SMK-PMVGHI`, `.tmp/present-smoke-SMK-PMVGHI.json`). `pnpm --filter @tcw/present smoke:livekit:endpoint` verifies configured LiveKit RoomService API credentials, valid-token signaling, and TCP fallback port reachability by connecting to `7881/tcp`, creating/listing/deleting a disposable room, and opening a LiveKit `/rtc` WebSocket; this stronger local preflight now writes durable JSON reports and passed on 2026-06-22 (`tcw-present-preflight-mqoz2jev-6ac1201b`, `.tmp/livekit-endpoint-preflight-tcw-present-preflight-mqoz2jev-6ac1201b.json`, `tcpFallbackReachable: true`). Entra tenant browser-login smoke test and production `wss://live.tc-waiblingen.de` browser/network verification without TURN remain open.

Additional evidence status: after tightening `verify:production-evidence`, final production endpoint reports must prove the derived API URL, the expected TCP fallback host/port, a masked API key, and no token/secret-looking fields. Final production native-picker reports must also prove `PRESENT_SMOKE_SECRET_CHECK=1`, no LiveKit secret leak, at least one actual secret-value marker scanned, pre-live viewer waiting, and pre-live viewer-token rejection. The production Entra preflight report must come from the real tenant-specific Entra app; dummy `common` discovery reports are useful development checks but are rejected as final production evidence. The validator test suite now includes a complete production-style evidence bundle check without partial/dev-auth allowances, so the final report set is exercised together instead of only one report type at a time. The older local native-picker report `.tmp/present-smoke-SMK-P2JZHW.json` and the later rerun `.tmp/present-smoke-SMK-P6211K.json` still prove the real picker path and activation-safe `Change screen`, but they do not satisfy the current production-evidence validator by themselves.

---

## File Structure

**Create:**
- `apps/present/AGENTS.md`
- `apps/present/package.json`
- `apps/present/next.config.ts`
- `apps/present/prettier.config.mjs`
- `apps/present/tsconfig.json`
- `apps/present/eslint.config.mjs`
- `apps/present/vitest.config.ts`
- `apps/present/vitest.setup.ts`
- `apps/present/src/app/...`
- `apps/present/src/components/...`
- `apps/present/src/lib/...`
- `apps/present/src/proxy.ts`
- `apps/present/data/.gitkeep`
- `apps/present/.env.example`
- `infra/livekit/...`

**Modify:**
- `package.json`
- `turbo.json` only if needed for new scripts
- `.gitignore` only if the new app needs additional generated paths

---

## Task 1: Scaffold `apps/present`

Create the new app without changing existing apps.

- [x] **Step 1.1: Create package and config files**

Create `apps/present/package.json` with:
- name `@tcw/present`
- scripts: `dev`, `build`, `start`, `lint`, `test`, `test:watch`, `test:coverage`
- port `3003` for `dev` and `start`
- dependencies matching the stack above

- [x] **Step 1.2: Add root scripts**

Add:
- `dev:present`
- `build:present`
- `lint:present`
- `test:present`

- [x] **Step 1.3: Add app documentation**

Create `apps/present/AGENTS.md` documenting:
- routes
- auth model
- LiveKit env vars
- DB path
- local development commands
- “web app does not implement the browser screen picker itself” constraint

- [x] **Step 1.4: Verify scaffold**

Run:
```bash
pnpm --filter @tcw/present lint
pnpm --filter @tcw/present test
pnpm --filter @tcw/present build
```

Expected: commands run, even if tests are initially empty.

---

## Task 2: Database and Domain Model

Use SQLite via `better-sqlite3`, matching `apps/dispo`.

**Tables:**
- `presentations`
- `presentation_events`
- `app_settings` only if app-wide settings are needed later

**Presentation fields:**
- `id`
- `code` unique, human-readable, uppercase
- `title`
- `slug`
- `moderator_sub`
- `moderator_name`
- `viewer_password_hash`
- `status`: `draft | ready | live | ended`
- `livekit_room_name`
- `created_at`
- `updated_at`
- `starts_at`
- `ended_at`

**Presentation event fields:**
- `id`
- `presentation_id`
- `type`: `created | updated | went_live | ended | screen_started | screen_changed | viewer_joined`
- `payload_json`
- `created_at`

- [x] **Step 2.1: Add schema setup**

Create:
- `apps/present/src/lib/db.ts`
- `apps/present/src/lib/presentations.ts`
- `apps/present/src/lib/presentation-code.ts`
- tests for code normalization/collision handling

- [x] **Step 2.2: Add password hashing**

Create:
- `apps/present/src/lib/viewer-password.ts`

Use argon2id with the same explicit parameters used by `apps/dispo/src/lib/settings.ts`.

- [x] **Step 2.3: Verify model**

Run:
```bash
pnpm --filter @tcw/present test -- presentations viewer-password presentation-code
```

Expected: create/read/update flows pass; password verification rejects wrong passwords and unset hashes.

---

## Task 3: Moderator Authentication

Reuse the `apps/dispo` Entra pattern, but keep implementation local to `apps/present` for now.

**Routes:**
- `/login`
- `/api/auth/entra/start`
- `/api/auth/entra/callback`
- `/api/auth/logout`

**Session roles:**
- `moderator`
- `admin`

**Environment:**
- `PRESENT_SESSION_SECRET`
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `ENTRA_ADMIN_ROLE`, default `Present.Admin`
- `ENTRA_MODERATOR_ROLE`, default `Present.Moderator`

- [x] **Step 3.1: Add session JWT helpers**

Create:
- `apps/present/src/lib/auth.ts`
- tests for signing, verification, expiry, bad secret, role validation

- [x] **Step 3.2: Add Entra OIDC flow**

Create:
- `apps/present/src/lib/entra.ts`
- `apps/present/src/app/api/auth/entra/start/route.ts`
- `apps/present/src/app/api/auth/entra/callback/route.ts`

Use PKCE, state, nonce, and safe `next` redirect handling.

- [x] **Step 3.3: Add route protection**

Create `apps/present/src/proxy.ts`.

Protect:
- `/presentations`
- `/moderator`
- mutating `/api/presentations/*`
- `/api/livekit/moderator-token`

Do not protect:
- `/p/[code]`
- `/api/viewer-login`
- viewer LiveKit token route after viewer session checks

- [x] **Step 3.4: Verify auth**

Run:
```bash
pnpm --filter @tcw/present test -- auth
pnpm --filter @tcw/present build
```

Expected: auth tests pass and protected routes build.

Status: verified locally on 2026-06-22. Auth/Entra tests cover session signing and expiry, Entra PKCE request construction, role mapping, missing-role rejection, start-route temporary cookies, callback exchange, callback cookie cleanup, exchange failure, route protection, public viewer-route bypass, and safe redirect handling. Production cookie tests verify Entra PKCE/state cookies, moderator session cookies, and password-only viewer session cookies are marked `Secure` in `NODE_ENV=production`. Dev auth route tests verify `/api/auth/dev` is disabled by default and remains disabled in `NODE_ENV=production` even if `PRESENT_DEV_AUTH=1`, while still creating a local moderator session in development. The callback route now sanitizes the temporary `next` cookie before redirecting. `pnpm --filter @tcw/present preflight:entra` is available for runtime Entra discovery and authorization URL checks and writes `.tmp/entra-preflight-*.json` by default. It was run against Microsoft `common` discovery with `PRESENT_PUBLIC_URL=https://present.tc-waiblingen.de` and dummy client credentials, verifying discovery metadata, `/api/auth/entra/callback` redirect URL construction, code flow, PKCE, state/nonce, and `openid profile` scope; the development report is `.tmp/entra-preflight-unknown-0000-0000.json`. This preflight intentionally does not prove client-secret validity, redirect URI registration, or app-role assignment; those still require a real tenant browser-login smoke. `verify:production-evidence` now rejects the dummy/common report and requires tenant-specific Entra preflight evidence for final production acceptance. Full `test`, `lint`, and `build` pass.

---

## Task 4: Design 03 Access Flow

Build the presenter setup flow and viewer access UX.

**Moderator routes:**
- `/presentations`
- `/presentations/new`
- `/presentations/[code]/edit`
- `/presentations/[code]/handout`

**Viewer routes:**
- `/p/[code]`
- `/p/[code]/watch`

- [x] **Step 4.1: Create presentation list and form**

Build a dense operational UI, not a marketing page:
- title
- presentation code
- starts at
- viewer password
- status
- actions: create, save, mark ready, open moderator room, handout

- [x] **Step 4.2: Add code reservation**

Allow a moderator to create a presentation code before the event. Code generation should be readable and printable, e.g. `WAI-0426`, with manual override and collision validation.

- [x] **Step 4.3: Add QR handout**

Generate a QR code for `/p/[code]`.

Handout must include:
- title
- URL
- code
- viewer password
- date/time

Prefer a print-friendly HTML page first. PDF export can follow only if print output is insufficient.

- [x] **Step 4.4: Add viewer password login**

Viewer flow:
- QR opens `/p/[code]`
- if presentation exists and is not ended, show password-only form
- on success, set an anonymous viewer session cookie scoped to that presentation
- redirect to `/p/[code]/watch`

No username field. Viewer identity for LiveKit can be generated server-side, e.g. `viewer:<presentation-id>:<random-id>`.

- [ ] **Step 4.5: Verify Access Flow**

Run:
```bash
pnpm --filter @tcw/present test -- presentations viewer
pnpm --filter @tcw/present build
```

Manual checks:
- create code before live session
- print handout page
- scan/open QR URL
- wrong password rejected
- correct password reaches waiting/watch page

Status: automated checks pass. Local HTTP smoke covered code creation, handout page, wrong password rejection, correct password login, watch page, ending, and token rejection after end. Route tests now verify authenticated presentation creation, anonymous creation rejection, missing viewer password rejection, ended-presentation rejection, wrong password rejection, password-only viewer session cookie issuance, viewer-token rejection before the presentation is live, and `viewer_joined` event logging. Viewer session cookies use presentation-specific names while the JWT carries the exact `presentationId` and code; watch and viewer-token routes read the cookie for the requested code and still reject mismatched sessions. Authenticated viewers can reach the waiting page before live, but the viewer-token route withholds LiveKit media access until the presentation status is `live`. Component/page tests verify the moderator list, empty state, create form, edit form, protected edit behavior, disabled code field on edit, handout/control-room links, and that stored password hashes are not rendered. Server-component test verifies the handout QR is generated for the exact viewer URL, the public URL/code/title render, and the stored password hash is not rendered. QR helper tests generate a real PNG data URL and verify the PNG signature plus requested square dimensions. `pnpm --filter @tcw/present smoke:local:handout` passed locally on 2026-06-22 (`SMK-OUUASO`), rendered the handout through Chromium, decoded the rendered QR image to the exact viewer URL, filled the print-time password field, exported `.tmp/present-handout-SMK-OUUASO.pdf`, verified a non-empty PDF with a valid header, rendered the first PDF page through `pdftoppm`, and decoded the QR from the PDF render to the exact viewer URL. Physical QR scan from printed paper still pending.

---

## Task 5: Self-Hosted LiveKit Infrastructure

Create repo-owned deployment assets for a single production VM.

**Recommended deployment:**
- one Ubuntu VM
- Docker Compose
- LiveKit server
- Redis
- Coolify or a reverse proxy for TLS/WSS signaling

**Domains:**
- app: `present.tc-waiblingen.de`
- LiveKit WebSocket/API: `live.tc-waiblingen.de`

**Ports, TURN-free deployment:**
- HTTPS for LiveKit signaling: `443`
- LiveKit HTTP internally: `7880`
- LiveKit TCP fallback: `7881`
- UDP media range: `50000-60000`
- no TURN/coturn ports (`3478`, `5349`) in the current scope

- [x] **Step 5.1: Add infrastructure docs**

Create `infra/livekit/README.md` with:
- DNS requirements
- VM firewall requirements
- environment variables
- backup/restore notes
- upgrade process
- how to run a smoke test

Status: `infra/livekit/README.md` documents the TURN-free deployment scope, DNS, LiveKit firewall ports, health checks, backup/restore, upgrade process, local and production smoke commands, and a Coolify checklist. The Coolify section now covers the `apps/present` Dockerfile path, internal port `3003`, `/data` volume, `/api/health` health path, full production app/Entra/LiveKit environment contract, LiveKit Compose setup, `live.tc-waiblingen.de` TLS/WSS routing to `7880`, host exposure for `7881/tcp`, direct `50000-60000/udp` firewall rules, and the production verification order.

- [x] **Step 5.2: Generate or write Docker Compose config**

Use LiveKit’s VM guidance as the baseline. Commit sanitized templates, not secrets:
- `infra/livekit/docker-compose.example.yml`
- `infra/livekit/livekit.example.yaml`
- `infra/livekit/caddy.example.yaml` if Caddy is used

- [x] **Step 5.3: Define app env contract**

Add to `apps/present/.env.example`:
- `PRESENT_DB_PATH`
- `PRESENT_PUBLIC_URL`
- `PRESENT_SESSION_SECRET`
- Entra vars
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- optional `LIVEKIT_ROOM_PREFIX`

- [x] **Step 5.4: Verify LiveKit locally**

Run LiveKit locally and verify:
- LiveKit responds on `http://localhost:7880`
- the app can create and delete LiveKit rooms
- two browser sessions can join the same local room
- viewer count updates when a viewer joins
- no TURN/coturn service is required locally

Status: verified locally with `mise run livekit:up`, `ws://localhost:7880`, app token routes, LiveKit room service calls, and headless browser sessions connected to the same room. Local templates now pin `livekit/livekit-server:v1.13.1`. `LIVEKIT_URL=ws://localhost:7880 LIVEKIT_API_KEY=devkey LIVEKIT_API_SECRET=devsecretdevsecretdevsecretdevsecret pnpm --filter @tcw/present smoke:livekit:endpoint` passed locally on 2026-06-22, connecting to the TCP fallback port, creating, listing, opening a valid-token `/rtc` signaling WebSocket for, deleting disposable room `tcw-present-preflight-mqoz2jev-6ac1201b`, and writing `.tmp/livekit-endpoint-preflight-tcw-present-preflight-mqoz2jev-6ac1201b.json`.

- [ ] **Step 5.5: Verify production LiveKit endpoint**

Against `live.tc-waiblingen.de`, verify:
- browser can connect via `wss://live.tc-waiblingen.de`
- direct UDP media works from a non-LAN client
- WebRTC TCP fallback works where UDP is blocked but TCP is allowed
- restrictive networks that block both direct UDP and TCP fallback are documented as unsupported until TURN is added later

Status: `pnpm --filter @tcw/present smoke:livekit:endpoint` is available for production endpoint and credential preflight with `LIVEKIT_URL=wss://live.tc-waiblingen.de`. It proves the RoomService API route, reverse proxy path, credentials, valid-token `/rtc` signaling path, and LiveKit TCP fallback port reachability by connecting to the configured TCP fallback port (`LIVEKIT_TCP_FALLBACK_PORT`, default `7881`), creating/listing/deleting a disposable room, opening a LiveKit signaling WebSocket, and writing a durable JSON report. It does not prove browser WebRTC media or direct UDP media; those remain part of Step 11.3 once the production endpoint and test networks are available.

---

## Task 6: LiveKit Token and Room API

The browser never receives `LIVEKIT_API_SECRET`.

**Server routes:**
- `POST /api/livekit/moderator-token`
- `POST /api/livekit/viewer-token`
- `POST /api/presentations/[code]/go-live`
- `POST /api/presentations/[code]/end`

**Moderator grants:**
- join room
- publish screen-share video only
- subscribe
- update metadata if needed

**Viewer grants:**
- join room
- subscribe only
- no publishing

- [x] **Step 6.1: Add LiveKit server helper**

Create:
- `apps/present/src/lib/livekit.ts`

Use `livekit-server-sdk` to:
- build room names
- create access tokens
- optionally create/delete/list rooms with `RoomServiceClient`

- [x] **Step 6.2: Add token routes**

Moderator token route validates moderator session and presentation ownership/role.

Viewer token route validates viewer session for the exact presentation code.

- [x] **Step 6.3: Add room lifecycle**

`go-live`:
- set status `live`
- ensure LiveKit room name exists
- log event

`end`:
- set status `ended`
- optionally remove participants/close room through LiveKit server API
- log event

Status: verified locally on 2026-06-22. Route tests cover anonymous and wrong-moderator rejection for presentation update, go-live, and end. Update tests verify editable field parsing and status restrictions. Go-live tests verify LiveKit room creation happens before `markPresentationLive`, and ended presentations now return `409` without creating a LiveKit room. End tests verify `endPresentation` is called and the updated room is closed through LiveKit.

- [x] **Step 6.4: Verify token security**

Tests:
- anonymous cannot get moderator token
- wrong moderator cannot manage a presentation
- viewer cannot get token before password login
- viewer token cannot publish
- ended presentation rejects viewer token

Run:
```bash
pnpm --filter @tcw/present test -- livekit
```

Status: verified locally on 2026-06-22. LiveKit token tests decode generated JWT claims and verify moderator identity/name/metadata, `canPublish: true`, `canSubscribe: true`, `canPublishData: false`, and `canPublishSources: ['screen_share']` without camera or microphone sources. Viewer token tests verify subscribe-only grants with `canPublish: false` and `canPublishData: false`. Token route tests cover missing code, anonymous moderator rejection, wrong moderator rejection, ended-presentation rejection, viewer-token rejection before the presentation is live, password-session enforcement, and successful moderator/viewer responses that include only `token`, `url`, and `room`, with no `apiKey` or `apiSecret`. `pnpm --filter @tcw/present smoke:local:secret-check` passed locally (`SMK-OTFFR4`) and scanned the live moderator/viewer token responses for `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY`, `apiSecret`, `apiKey`, and the configured local secret value.

---

## Task 7: Design 01 Control Room

Build `/moderator/[code]` as the operational live room.

**Required UI:**
- current presentation title/code
- status: draft/ready/live/ended
- QR/code panel
- live preview
- start sharing
- change screen
- stop sharing
- go live
- end presentation
- viewer count
- connection quality
- selected codec/bitrate display from LiveKit stats where available

- [x] **Step 7.1: Connect moderator room**

Use `livekit-client` / React components with:
- `adaptiveStream: true`
- `dynacast: true`
- explicit screen-share publish defaults

- [x] **Step 7.2: Start screen sharing**

Use:
```ts
await room.localParticipant.setScreenShareEnabled(true)
```

This triggers the browser-native picker from the moderator's real browser click.

- [x] **Step 7.3: Change screen**

Implement `Change screen` by requesting the replacement screen track from the moderator's direct click first, then unpublishing the old screen-share track and publishing the replacement. This keeps `getDisplayMedia()` inside browser user activation while still reopening the native picker and switching the live screen.

- [x] **Step 7.4: Add stream-health panel**

Display:
- viewer count from room participants
- current publish status
- connection state
- selected/negotiated quality indicators where available
- warning if no screen-share track is published while presentation is live

- [ ] **Step 7.5: Verify Control Room**

Manual checks:
- sign in with Entra
- open moderator room
- start screen sharing
- change screen while viewers remain connected
- stop sharing
- end presentation

Build check:
```bash
pnpm --filter @tcw/present build
```

Status: build passes. `pnpm --filter @tcw/present smoke:local` verifies moderator/viewer LiveKit connection and viewer count via `ws://localhost:7880` before attempting screen capture. The default and headed real-capture smokes use Chromium auto-select flags for unattended runs; those auto-select runs reached `getDisplayMedia` but macOS blocked the video source in Chromium headless, Chromium headed, direct `CHROMIUM_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium`, Microsoft Edge headed, and the 2026-06-22 default Chromium smoke run (`SMK-OCB7JQ`). `pnpm --filter @tcw/present smoke:local:native-picker` opens headed Chromium and waits up to five minutes for manual `Start sharing`/`Change screen` clicks plus native picker selections; it passed locally in Chromium on 2026-06-22 (`SMK-ORLA0G`, `SMK-OZDBM3`, `SMK-P2JZHW`), verifying go-live, viewer login/watch, screen publish, viewer video receipt, `Change screen`, and a durable JSON report for the latest real-picker run (`.tmp/present-smoke-SMK-P2JZHW.json`). `pnpm --filter @tcw/present smoke:production:native-picker` is now available for the same real-picker acceptance path against `https://present.tc-waiblingen.de` with interactive Entra login. `pnpm --filter @tcw/present smoke:local:fake-screen` passed locally again on 2026-06-22 (`SMK-OWWNE8`) and now verifies Start sharing, Stop, viewer return to waiting, restart sharing, Change screen, and End with test-only fake media. `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp pnpm --filter @tcw/present smoke:local:fake-screen` passed again with viewers opened before go-live (`SMK-PF6RF7`, `.tmp/present-smoke-SMK-PF6RF7.json`), proving pre-live viewer waiting, pre-live viewer-token rejection, UDP media paths, Stop/restart, Change screen, End, and end-state viewer-token rejection. `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp pnpm --filter @tcw/present smoke:local:five-viewers` then passed with five pre-live viewers (`SMK-PLP0L2`, `.tmp/present-smoke-SMK-PLP0L2.json`) and five resolved UDP viewer paths. Screen start/change audit events are recorded through a protected moderator-owned API route after successful screen publish/change. `ModeratorRoom` component tests verify the live-without-screen warning appears only when the presentation is live and no screen share is published. Entra sign-in still needs tenant smoke testing.

Additional status: `Change screen` now captures the replacement display track before unpublishing the current one, avoiding an async stop-before-picker sequence that can trigger browser user-activation errors. `pnpm --filter @tcw/present smoke:local:fake-screen` passed with the activation-safe replacement path on 2026-06-22 (`SMK-P5NKCC`, `.tmp/present-smoke-SMK-P5NKCC.json`), verifying Start sharing, Stop, viewer return to waiting, restart sharing, Change screen, moderator end, viewer ended state, viewer-token rejection after end, and UDP media paths.

---

## Task 8: Viewer Watch Page

Build `/p/[code]/watch` as a focused subscriber page.

**Required UI:**
- waiting state before moderator goes live
- live state with shared screen filling available space
- ended state
- reconnecting state
- wrong/expired session redirects to password page
- no visible username input anywhere

- [x] **Step 8.1: Connect viewer room**

Use viewer token route and subscribe only to the moderator’s screen-share track. Do not show participant grids unless later requested.

- [x] **Step 8.2: Render adaptive screen video**

Attach LiveKit tracks using SDK attachment APIs so adaptive stream can react to element size and visibility.

- [x] **Step 8.3: Add viewer states**

States:
- `waiting`: presentation ready but no screen track
- `live`: screen track subscribed
- `reconnecting`: LiveKit connection interrupted
- `ended`: app status ended or room disconnected after end

- [ ] **Step 8.4: Verify viewer flow**

Manual multi-browser check:
- browser A moderator
- browser B viewer
- browser C viewer
- B/C join before live, wait
- A starts share, B/C receive stream
- A changes screen, B/C stay in room and update stream
- A ends, B/C show ended state

Status: viewer implementation builds. Local browser smoke verified viewer password login, LiveKit connection, waiting state, moderator-side viewer count, live screen receipt, changed-screen receipt, viewer ended state after moderator end, and viewer-token rejection after end. Server-component tests now verify the viewer login page renders only a password form, never username/email fields, shows wrong-password feedback, hides the form after a presentation ended, and returns not found for unknown codes. Watch-page tests verify valid viewer sessions render the viewer room, missing or mismatched sessions redirect back to `/p/[code]`, unknown codes return not found, and ended status is passed to the viewer room for already-authenticated viewers. `ViewerRoom` now reconciles already-published remote publications immediately after `room.connect`, accepts unknown-source video publications only when they use the moderator screen track name, detaches unknown-source video when unsubscribed, ignores unknown-source audio and non-screen unknown video, keeps the replacement screen track live if the old screen track unsubscribes after a new track has already attached, and stays in the waiting state without connecting to LiveKit while the token route reports the presentation is not live; component tests cover those cases. `pnpm --filter @tcw/present smoke:local:native-picker` passed locally on 2026-06-22 (`SMK-ORLA0G`, `SMK-OZDBM3`, `SMK-P2JZHW`, `SMK-P6211K`) and verified viewer video receipt after initial real screen publish and after `Change screen`. `pnpm --filter @tcw/present smoke:local:five-viewers` passed locally on 2026-06-22 (`SMK-PLP0L2`) and verified five isolated pre-live viewers waited without receiving tokens, connected after go-live, received the initial fake-screen share, reported resolved UDP media paths, received the changed share, showed ended state after moderator `End`, and could not obtain a fresh viewer token. `pnpm --filter @tcw/present smoke:local:fake-screen` passed again after the stale-unsubscribe viewer guard (`SMK-P6CRQY`, `.tmp/present-smoke-SMK-P6CRQY.json`), again after tightening unknown-source video filtering with explicit UDP media-path proof (`SMK-PE9UFJ`, `.tmp/present-smoke-SMK-PE9UFJ.json`), and again with viewers opened before go-live (`SMK-PF6RF7`, `.tmp/present-smoke-SMK-PF6RF7.json`, `viewerWaitingBeforeLive: true`, `viewerTokenRejectedBeforeLive: true`), covering pre-live waiting, pre-live token rejection, Stop, viewer waiting, restart, Change screen, End, viewer ended state, and fresh-token rejection after end.

---

## Task 9: Quality, Codecs, and Bitrate Defaults

Do not build a complex codec control panel first. Prefer good automatic behavior, with transparent status.

**Defaults:**
- enable `adaptiveStream`
- enable `dynacast`
- keep simulcast enabled unless screen-share quality testing proves otherwise
- target 1080p, 15-30 fps for screen content
- use browser/LiveKit negotiation for codec choice
- expose a compact status label, not a required moderator decision

- [x] **Step 9.1: Add publish defaults**

Configure screen-share publish defaults for readable text:
- high enough bitrate for text
- moderate framerate
- no microphone track
- no camera track

- [x] **Step 9.2: Add low-bandwidth behavior**

Viewers should remain connected when bandwidth drops. Let LiveKit adaptive stream pick the suitable layer. Add UI copy only for real errors, not normal adaptation.

- [x] **Step 9.3: Add diagnostic mode**

Add moderator-only diagnostics behind a query param or collapsible panel:
- codec
- bitrate estimate
- packet loss if available
- connection quality
- room sid/name

Status: verified locally on 2026-06-22. The moderator Diagnostics panel now shows room name, server-assigned room SID, local participant connection quality, screen status, negotiated codec, bitrate estimate, packet loss, selected WebRTC media path, and the 1080p/15fps target. The viewer page records its subscriber-side selected media path in a non-visual `data-media-path` attribute for smoke tests. `pnpm --filter @tcw/present smoke:local:fake-screen` passed against a freshly restarted dev server (`SMK-OVSIOU`) and now asserts the diagnostics panel contains the expected room name, a non-pending room SID, a valid connection-quality label, connected screen status, a resolved moderator media path, and resolved viewer media paths. The local moderator and viewer paths both reported `UDP host -> prflx`, which proves the stats extraction can expose UDP/TCP transport observations for production network checks.

- [ ] **Step 9.4: Verify real networks**

Test at minimum:
- same LAN
- mobile hotspot
- restricted/corporate network if available
- Safari, Chromium, Firefox

No TURN relay is part of this verification. If a restricted network cannot connect with direct UDP or LiveKit TCP fallback, record it as a known limitation rather than adding coturn in this phase.

Status: the app now exposes the selected WebRTC candidate pair in moderator Diagnostics as `Media path`, and the browser smoke includes both the moderator publisher path and each viewer subscriber path in the JSON summary and durable report file. The smoke also accepts `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp` or `tcp`; when set, it fails unless the moderator path and every viewer path use the expected protocol and reports `mediaProtocolMatched: true` on success. This was verified locally with `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp pnpm --filter @tcw/present smoke:local:fake-screen` (`SMK-OXOOLX`), where moderator and viewer paths both reported `UDP host -> prflx` and `.tmp/present-smoke-SMK-OXOOLX.json` recorded the result. This gives production testers direct pass/fail evidence for direct UDP and TCP fallback runs. `infra/livekit/production-manual-evidence.example.json` now captures same-LAN, non-LAN UDP, TCP fallback availability, restrictive-network limitation notes, and Chromium/Safari/Firefox viewer checks so those manual results can be validated with `pnpm --filter @tcw/present verify:production-evidence`. Actual same-LAN, hotspot, restricted-network, Safari, Chromium, and Firefox checks remain pending.

---

## Task 10: Deployment and Operations

Prepare the app and LiveKit server for real use.

- [x] **Step 10.1: Dockerize `apps/present`**

Add a production Dockerfile or extend the existing deployment pattern if one exists later.

Required runtime:
- Node runtime
- persistent volume for SQLite
- env vars
- health endpoint

Status: verified locally on 2026-06-22. `docker build -f apps/present/Dockerfile -t tcw-present:local .` completed successfully, including the production `next build` inside the container. The built image previously started with `/data/present.db` and returned `200 OK` from `http://localhost:3013/api/health` with database and LiveKit config healthy; after adding production auth and URL readiness to `/api/health`, route tests now cover the added production failure modes and local-dev exemption. The production image includes a Docker `HEALTHCHECK` against `/api/health`, so future container health checks require production auth env vars plus browser-facing `https://` app and `wss://` LiveKit URLs, even when the app itself sits behind an internal HTTP proxy. The root `.dockerignore` excludes `apps/present/.tmp` and `apps/present/data/*.db*` so local smoke reports, Chromium profiles, PDFs, and SQLite databases are not sent to the Docker daemon or copied into intermediate build stages; after tightening those rules the Docker build context transferred `26.43kB` and the image still built successfully. Coolify deployment notes now call out the required `/data` volume, `PRESENT_DB_PATH=/data/present.db`, production Entra settings, LiveKit credentials, internal port `3003`, and `/api/health` health path.

- [x] **Step 10.2: Add backups**

Document:
- SQLite backup path
- LiveKit config backup
- restore procedure

- [x] **Step 10.3: Add health checks**

App:
- `/api/health`
- DB reachable
- LiveKit URL configured

LiveKit:
- service running
- WebSocket reachable
- Redis reachable

Status: app `/api/health` returns structured DB, LiveKit config, and production auth readiness without exposing secrets. In production, health now fails when `PRESENT_PUBLIC_URL`, a strong `PRESENT_SESSION_SECRET`, required Entra app values, a tenant-specific Entra tenant, a browser-facing `https://` app URL, or a browser-facing `wss://` LiveKit URL are missing; local development still stays healthy when dev auth, dummy Entra values, `http://localhost`, and `ws://localhost` are used. This is compatible with Coolify because the check validates configured external URLs, not the incoming proxy scheme. The app Docker image has a container-level healthcheck against `/api/health`. Production Compose has LiveKit HTTP and Redis health checks, and local Compose has a LiveKit HTTP health check. Verified locally on 2026-06-21 with `/api/health` returning `ok: true` and `local-livekit-1` reporting `healthy`; route tests on 2026-06-22 cover the added production auth/URL readiness checks and confirm no configured auth or LiveKit secrets are returned. The endpoint preflight command `pnpm --filter @tcw/present smoke:livekit:endpoint` verifies LiveKit RoomService API credentials, the valid-token signaling WebSocket, and TCP fallback port reachability without exposing secrets in output or its JSON report; the production evidence validator now rejects mismatched endpoint API URLs, mismatched TCP fallback host/port values, unmasked endpoint API keys, and token/secret-looking endpoint report fields, and endpoint report paths that do not include the preflight room name. Production `wss://live.tc-waiblingen.de` browser/media verification remains tracked in Step 5.5 and Step 11.3.

- [x] **Step 10.4: Add basic audit logging**

Log presentation lifecycle events and auth-sensitive failures without storing viewer passwords or LiveKit secrets.

Status: verified locally on 2026-06-22. Presentation lifecycle events cover `created`, `updated`, `went_live`, `ended`, `viewer_joined`, `screen_started`, and `screen_changed`. The screen-event route rejects anonymous users, wrong moderators, ended presentations, and invalid event types. The moderator room records `screen_started` after successful initial publish and `screen_changed` after successful replacement publish. Screen publish/change audit events use null payloads, so they do not store viewer passwords or LiveKit secrets.

---

## Task 11: End-to-End Verification

This is not complete until the full real workflow works.

- [x] **Step 11.1: Automated checks**

Run:
```bash
pnpm --filter @tcw/present lint
pnpm --filter @tcw/present test
pnpm --filter @tcw/present build
```

Status: verified locally on 2026-06-22. `pnpm --filter @tcw/present test` passed with 30 test files and 155 tests after adding `ModeratorRoom` live-without-screen warning coverage, viewer-token not-live rejection, `ViewerRoom` waiting-before-live coverage, production-evidence browser/native pre-live viewer proof checks, complete production evidence bundle acceptance, production `/api/health` auth/URL-readiness checks, `ViewerRoom` subscription reconciliation, unknown non-screen video rejection, unknown-source unsubscribe coverage, stale-unsubscribe replacement-track coverage, native-picker secret-scan evidence checks, tenant-specific Entra production-evidence checks, mandatory browser-report media-protocol validation, rejection of dev-auth reports for production base URLs, resolved media-path validation for production smoke reports, manual-note placeholder/password/secret scanning, endpoint evidence hygiene checks, automated-report metadata/timestamp-order checks, report-path traceability checks, TCP fallback address checks, physical QR URL evidence checks, token-route LiveKit URL evidence checks, browser headed/auto-mode evidence checks, and IPv6 loopback local-base-url coverage. `pnpm --filter @tcw/present test -- auth/entra viewer-login` passed with 28 test files and 109 tests, including production `Secure` cookie assertions for moderator and viewer auth flows. `pnpm --filter @tcw/present test -- auth/dev` passed with 28 test files and 106 tests, including the production-disabled dev auth safeguard. `pnpm --filter @tcw/present test -- production-evidence` passed with 30 test files and 147 tests after adding complete production-style bundle acceptance, browser/native pre-live viewer evidence rejection, native-picker evidence checks for browser-visible LiveKit secret scanning, actual secret-value marker coverage, rejection of dummy/common Entra preflight evidence, rejection of browser reports without `--protocol udp|tcp`, rejection of automated reports without started/completed timestamps, elapsed time, durable report path, or presentation code, rejection of automated reports with `completedAt` before `startedAt`, rejection of report paths that do not include the claimed preflight room or presentation code, rejection of interactive browser reports that did not run headed or did not use auto picker mode, rejection of dev-auth reports for non-local base URLs, rejection of unresolved `Waiting`/`Unavailable` media paths, rejection of placeholder, password-like, or secret-looking manual notes, rejection of missing/mismatched physical QR expected/scanned URLs, rejection of mismatched browser smoke token-route LiveKit URLs, rejection of unmasked LiveKit endpoint API keys/token leaks/API URL mismatches/TCP fallback address mismatches, acceptance of masked endpoint evidence and custom TCP fallback ports, and IPv6 loopback local dev-auth evidence. `pnpm --filter @tcw/present test -- api/health` passed with 30 test files and 155 tests after adding production auth readiness, production HTTPS/WSS URL readiness, production tenant-specific Entra readiness, local-dev auth/URL exemption, and secret-redaction checks. `pnpm --filter @tcw/present lint` passed after the app ESLint config was extended to ignore generated `.tmp` and `data` output. `pnpm --filter @tcw/present build` passed with all app routes and proxy compiled, including `/api/presentations/[code]/screen-event`. `pnpm --filter @tcw/present preflight:entra` passed against Microsoft `common` discovery with dummy client credentials and the production public URL, writing `.tmp/entra-preflight-unknown-0000-0000.json`; that report is development evidence only and is rejected by the production evidence validator. `pnpm --filter @tcw/present smoke:local:handout` passed with rendered-page and exported-PDF QR decoding (`SMK-OUUASO`). `pnpm --filter @tcw/present smoke:local:native-picker` passed with real browser-native picker capture, viewer receipt, `Change screen`, end-state checks, and `.tmp/present-smoke-SMK-P2JZHW.json` (`SMK-P2JZHW`); it passed again after macOS screen-recording permissions were restarted with `.tmp/present-smoke-SMK-P6211K.json` (`SMK-P6211K`). Those local reports prove the picker path but do not satisfy the current production-evidence validator because they lack production secret-scan enforcement, token-route LiveKit URL evidence, and the stricter current report metadata. `pnpm --filter @tcw/present smoke:local:fake-screen` passed after the screen-share pending-state and native-picker runner updates (`SMK-OWWNE8`), after the activation-safe `Change screen` replacement update (`SMK-P5NKCC`, `.tmp/present-smoke-SMK-P5NKCC.json`), and after the stale-unsubscribe viewer guard (`SMK-P6CRQY`, `.tmp/present-smoke-SMK-P6CRQY.json`). `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp pnpm --filter @tcw/present smoke:local:fake-screen` passed locally with `mediaProtocolMatched: true` and wrote `.tmp/present-smoke-SMK-OXOOLX.json` (`SMK-OXOOLX`), then passed again after moving viewer login/watch before go-live and wrote `.tmp/present-smoke-SMK-PF6RF7.json` (`SMK-PF6RF7`) with `viewerWaitingBeforeLive: true` and `viewerTokenRejectedBeforeLive: true`. `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp pnpm --filter @tcw/present smoke:local:five-viewers` passed locally after the pre-live viewer change with five isolated fake-screen viewers, five resolved UDP viewer paths, and `.tmp/present-smoke-SMK-PLP0L2.json` (`SMK-PLP0L2`). `PRESENT_SMOKE_VIEWERS=5 PRESENT_SMOKE_SECRET_CHECK=1 PRESENT_SMOKE_REFRESH=1 PRESENT_SMOKE_FAKE_SCREEN=1 PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp pnpm --filter @tcw/present smoke:local` passed locally with five viewers, secret scanning, pre-live viewer proof, viewer/moderator refresh recovery, UDP media-path assertion, elapsed-time metadata, end-state checks, and `.tmp/present-smoke-SMK-PMVGHI.json` (`SMK-PMVGHI`); `pnpm --filter @tcw/present verify:production-evidence -- --allow-partial --allow-dev-auth --base-url http://localhost:3003 --livekit-url ws://localhost:7880 --browser .tmp/present-smoke-SMK-PMVGHI.json --protocol udp` accepted that browser report. `pnpm --filter @tcw/present smoke:local:refresh` passed locally with viewer and moderator page reloads (`SMK-OS5KET`). `pnpm --filter @tcw/present smoke:local:secret-check` passed locally with browser-visible credential leak scanning (`SMK-OTFFR4`). `pnpm --filter @tcw/present smoke:livekit:endpoint` passed locally against `ws://localhost:7880` with the dev credentials, verified TCP fallback reachability and valid-token signaling, deleted disposable room `tcw-present-preflight-mqoz2jev-6ac1201b`, and wrote `.tmp/livekit-endpoint-preflight-tcw-present-preflight-mqoz2jev-6ac1201b.json`; `verify:production-evidence --allow-partial --endpoint .tmp/livekit-endpoint-preflight-tcw-present-preflight-mqoz2jev-6ac1201b.json --livekit-url ws://localhost:7880` accepts that saved endpoint report with the stricter endpoint checks.

- [ ] **Step 11.2: Manual acceptance test**

1. Moderator signs in with Entra.
2. Moderator creates a presentation code and password.
3. Moderator opens the handout page and verifies QR URL/password.
4. Viewer opens QR URL.
5. Viewer enters only the password.
6. Viewer waits if the session is not live.
7. Moderator opens Control Room.
8. Moderator starts screen sharing through browser picker.
9. Viewer sees the shared screen.
10. Moderator changes screen during the live session.
11. Viewer remains connected and sees the new share.
12. Moderator ends presentation.
13. Viewer sees ended state and cannot rejoin with a fresh token.

Status: local HTTP smoke covered steps 2-6, 12, and 13. Local browser smoke covered steps 7 and viewer connection state. `pnpm --filter @tcw/present preflight:entra` now covers Entra discovery and authorization URL construction before step 1, but step 1 still requires an actual Entra tenant browser sign-in session to prove client-secret validity, redirect URI registration, and app-role assignment. `pnpm --filter @tcw/present smoke:local:native-picker` passed locally on 2026-06-22 (`SMK-ORLA0G`, `SMK-OZDBM3`, `SMK-P2JZHW`) and covered steps 8-11 with the real browser-native picker. `pnpm --filter @tcw/present smoke:production:native-picker` is available for the same real-picker acceptance path after deployed Entra is configured. `pnpm --filter @tcw/present smoke:local:fake-screen` passed locally on 2026-06-22 (`SMK-OWWNE8`) and now covers steps 7-13 in a browser with test-only media: moderator control room, screen publish, viewer receipt, Stop, viewer waiting state, restart sharing, change screen, moderator end, viewer ended state, and viewer-token rejection after end. The latest UDP fake-screen smokes move viewer login/watch before go-live and prove step 6 directly (`SMK-PF6RF7` one viewer, `SMK-PLP0L2` five viewers) with `viewerWaitingBeforeLive: true` and `viewerTokenRejectedBeforeLive: true`. `SMK-PLP0L2` also covered the same fake-media flow with five isolated viewers, including five resolved UDP viewer media paths and ended-state/token-rejection checks.

- [ ] **Step 11.3: Production smoke test**

Against the self-hosted LiveKit VM:
- run one moderator and at least five viewers
- verify direct UDP from a non-LAN network
- verify LiveKit TCP fallback from a network where UDP is blocked, if available
- verify no LiveKit secrets are present in browser source/network responses
- verify app survives browser refresh on moderator and viewer pages

Do not add TURN for this smoke test. If the only failing case is a restrictive network that blocks both UDP media and TCP fallback, capture that as an explicit current limitation.

Status: local five-viewer fan-out is covered by `pnpm --filter @tcw/present smoke:local:five-viewers` (`SMK-PLP0L2` on 2026-06-22). That command uses isolated browser contexts and fake screen media to verify five unique pre-live viewer participants, pre-live waiting/token rejection, moderator-side viewer count, screen delivery to all viewers, resolved UDP media paths for all viewers, change-screen delivery, moderator end, viewer ended state, and viewer-token rejection after end. Local refresh behavior is covered by `pnpm --filter @tcw/present smoke:local:refresh` (`SMK-OS5KET` on 2026-06-22), which reloads a viewer during an active share, verifies screen receipt after reconnect, reloads the moderator page, verifies LiveKit reconnection and viewer count, restarts sharing, and continues through `Change screen`. Local browser-visible credential scanning is covered by `pnpm --filter @tcw/present smoke:local:secret-check` (`SMK-OTFFR4` on 2026-06-22), which scans moderator/viewer page HTML, same-origin Next chunks, and moderator/viewer token responses for LiveKit credential markers and now records the LiveKit URL returned by both token routes. `pnpm --filter @tcw/present smoke:production:interactive` now opens headed Chromium, waits for Entra login, creates a temporary presentation, logs in five isolated viewers, opens viewer pages before go-live, verifies pre-live waiting and viewer-token rejection, verifies moderator diagnostics, scans browser-visible responses for LiveKit credential markers, records token-route LiveKit URLs, publishes fake screen media through the configured production endpoint, verifies viewer receipt, records the selected WebRTC media path for the moderator and every viewer, supports `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp|tcp` for protocol-specific production evidence, reloads one viewer and the moderator to verify refresh recovery, writes a durable JSON report, changes screen, and ends the temporary presentation. `pnpm --filter @tcw/present smoke:production:native-picker` covers the production real browser picker path with interactive Entra login, one viewer, pre-live waiting/token rejection, secret scanning, token-route LiveKit URL evidence, initial share, change-screen, end-state, and the same durable report format. `pnpm --filter @tcw/present verify:production-evidence` checks the required production report bundle and fails missing Entra, endpoint, five-viewer browser, native-picker, manual printed-QR/browser-matrix/network evidence, actual-secret marker coverage on both browser smoke reports, token-route LiveKit URL mismatches, missing pre-live viewer proof, headed interactive browser mode, auto picker mode for fake-screen browser reports, refresh, explicit `--protocol udp|tcp` media-protocol proof for the browser report, and end-state proof. The validator tests now accept a complete production-style report bundle without partial/dev-auth allowances, reject otherwise valid native-picker reports when secret scanning did not run or did not include at least one actual secret-value marker, reject manual reports with missing or mismatched physical QR expected/scanned URLs, reject browser reports with missing pre-live viewer proof, mismatched token-route LiveKit URLs, or wrong headed/auto mode evidence, reject endpoint reports with unmasked API keys, token leaks, API URL mismatches, TCP fallback address mismatches, or report-path mismatches, reject browser/native reports with report-path mismatches, and reject browser reports when the validation command omits `--protocol`. The passed manual fixture was validated separately with `--allow-partial`, and the operational manual template was intentionally verified to fail while it still contains pending placeholders. The updated combined production-style fake-screen flags were verified locally with `SMK-PMVGHI`, including `elapsedMs: 38878`, `viewerTargetCount: 5`, `secretCredentialMarkersScanned: 5`, `secretValueMarkersScanned: 1`, `viewerWaitingBeforeLive: true`, `viewerTokenRejectedBeforeLive: true`, `noLiveKitSecretLeak: true`, `viewerRefreshSurvived: true`, `moderatorRefreshSurvived: true`, `mediaProtocolMatched: true`, and `viewerTokenRejectedAfterEnd: true` in `.tmp/present-smoke-SMK-PMVGHI.json`; the local partial production-evidence validator accepted that browser report with `--allow-dev-auth --base-url http://localhost:3003 --livekit-url ws://localhost:7880 --protocol udp`. A later one-viewer UDP fake-screen smoke after viewer filtering passed with `SMK-PE9UFJ`, `mediaProtocolMatched: true`, `screenChanged: true`, `viewerEnded: true`, and `viewerTokenRejectedAfterEnd: true` in `.tmp/present-smoke-SMK-PE9UFJ.json`; the latest one-viewer pre-live proof smoke passed with `SMK-PF6RF7`, and the latest five-viewer pre-live proof smoke passed with `SMK-PLP0L2`, `viewerWaitingBeforeLive: true`, `viewerTokenRejectedBeforeLive: true`, `mediaProtocolMatched: true`, five resolved UDP viewer paths, and `viewerTokenRejectedAfterEnd: true` in `.tmp/present-smoke-SMK-PLP0L2.json`. The same harness also accepts `PRESENT_SMOKE_MODERATOR_COOKIE='present_session=...'`; that copied-cookie branch was verified locally with fake screen media (`SMK-OVFLML`). The actual production smoke still needs to be run against `https://present.tc-waiblingen.de` / `wss://live.tc-waiblingen.de` from real non-LAN clients with UDP/TCP fallback observation and the production secret marker.

---

## Deferred Items

Do not implement these unless explicitly requested:
- recording/export via LiveKit Egress
- multi-moderator takeover
- chat/Q&A
- named viewer accounts
- analytics dashboard beyond basic room health
- custom native screen picker
- TURN/coturn relay fallback for restrictive networks
- multi-region LiveKit
- horizontally scaled app replicas with Postgres
