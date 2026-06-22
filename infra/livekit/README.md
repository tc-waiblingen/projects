# LiveKit Deployment

This folder contains LiveKit deployment assets for TCW Present.

## Current Scope

The active deployment intentionally excludes TURN/coturn. LiveKit is run as a self-hosted SFU with:

- WSS signaling on `live.tc-waiblingen.de`
- direct UDP media ports
- WebRTC TCP fallback
- Redis for production coordination

Do not open or document TURN ports for this phase. Restricted networks that block both direct UDP and LiveKit TCP fallback are a known limitation until a relay is added later.

## DNS

- `present.tc-waiblingen.de` -> Coolify app
- `live.tc-waiblingen.de` -> LiveKit endpoint

## Firewall

Open these ports on the LiveKit host:

- `443/tcp` for HTTPS/WSS signaling
- `7881/tcp` for WebRTC TCP fallback
- `50000-60000/udp` for WebRTC media

Do not expose `3478` or `5349`; there is no TURN service in this deployment.

If Coolify terminates TLS for `live.tc-waiblingen.de`, route traffic to LiveKit port `7880`.

## Health Checks

The production Compose template includes:

- LiveKit container health: `GET http://127.0.0.1:7880`
- Redis container health: `redis-cli ping`
- LiveKit startup dependency on healthy Redis

The local Compose file checks only LiveKit because local development runs without Redis.

The app exposes `/api/health`, which checks SQLite reachability, LiveKit URL/key/secret configuration, and production moderator-auth readiness without returning secret values. In production, health fails if `PRESENT_PUBLIC_URL`, a strong `PRESENT_SESSION_SECRET`, required Entra app values, a tenant-specific Entra tenant, a browser-facing `https://` public URL, or a browser-facing `wss://` LiveKit URL are missing.

The `apps/present` production image also defines a Docker `HEALTHCHECK` against `/api/health`, so Coolify or Docker can mark the web container unhealthy when SQLite, required LiveKit configuration, or production auth configuration is unavailable.

The root `.dockerignore` excludes `apps/present/.tmp` and `apps/present/data/*.db*` so local smoke reports, browser profiles, PDFs, and SQLite databases are not sent to the Docker daemon or copied into intermediate build stages. Keep `apps/present/data/.gitkeep`; runtime data belongs on the `/data` volume.

## Coolify Notes

Deploy `apps/present` as the web app and keep LiveKit as a separate Docker Compose service or VM service. Do not run LiveKit as a plain web app behind only the HTTP proxy; WebRTC still needs the TCP fallback port and UDP media range exposed on the LiveKit host.

### Coolify App Resource

Create the Present web app from this repository with:

- Dockerfile: `apps/present/Dockerfile`
- internal port: `3003`
- domain: `https://present.tc-waiblingen.de`
- persistent volume: mount to `/data`
- health path: `/api/health`

Production environment:

- `PRESENT_PUBLIC_URL=https://present.tc-waiblingen.de`
- `PRESENT_DB_PATH=/data/present.db`
- `PRESENT_SESSION_SECRET=<openssl-rand-hex-32-or-longer>`
- `ENTRA_TENANT_ID=<tenant-id>`
- `ENTRA_CLIENT_ID=<client-id>`
- `ENTRA_CLIENT_SECRET=<client-secret>`
- `ENTRA_ADMIN_ROLE=Present.Admin`
- `ENTRA_MODERATOR_ROLE=Present.Moderator`
- `LIVEKIT_URL=wss://live.tc-waiblingen.de`
- `LIVEKIT_API_KEY=<generated-key>`
- `LIVEKIT_API_SECRET=<generated-secret>`
- `LIVEKIT_ROOM_PREFIX=tcw-present`

These URLs are the external browser-facing values. The app can still receive plain HTTP from Coolify's internal proxy; do not change `PRESENT_PUBLIC_URL` to an internal `http://` URL or `LIVEKIT_URL` to an internal `ws://` URL in production.

Leave `PRESENT_DEV_AUTH` unset or `0` in production. The route is ignored in `NODE_ENV=production`, but keeping it disabled makes the intended auth mode explicit.

### Coolify LiveKit Resource

For LiveKit, use the Compose template in this folder:

1. Copy `infra/livekit/docker-compose.example.yml` and `infra/livekit/livekit.example.yaml` to the production LiveKit project.
2. Rename `livekit.example.yaml` to `livekit.yaml`.
3. Replace the placeholder key/secret in `livekit.yaml`.
4. Attach `live.tc-waiblingen.de` to LiveKit HTTP port `7880` for TLS/WSS.
5. Publish `7881/tcp` on the host for WebRTC TCP fallback.
6. Open `50000-60000/udp` on the host firewall and cloud firewall for direct media.
7. Keep Redis enabled for production.

Coolify or the reverse proxy may handle TLS for `live.tc-waiblingen.de`, but UDP media ports must still reach the LiveKit host directly. The Coolify HTTP proxy does not replace UDP firewall rules.

### Deployment Verification Order

After deployment:

1. Open `https://present.tc-waiblingen.de/api/health`; it must return `ok: true`.
2. Run `pnpm --filter @tcw/present preflight:entra` with production Entra values.
3. Run `pnpm --filter @tcw/present smoke:livekit:endpoint` with production LiveKit credentials.
4. Run `pnpm --filter @tcw/present smoke:production:interactive` from the target non-LAN network with `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp`.
5. Run `pnpm --filter @tcw/present smoke:production:native-picker` for the real browser picker.
6. Complete `production-manual-evidence.json`, including physical QR and browser matrix checks.
7. Run `pnpm --filter @tcw/present verify:production-evidence` with the collected reports.

## App Environment

Production `apps/present` needs:

```bash
LIVEKIT_URL=wss://live.tc-waiblingen.de
LIVEKIT_API_KEY=<generated-key>
LIVEKIT_API_SECRET=<generated-secret>
```

The key and secret must match `livekit.yaml`.

## Local Development

Use:

```bash
mise run livekit:up
mise run dev:present
```

Or:

```bash
mise run dev:present:all
```

Local defaults:

```bash
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecretdevsecretdevsecretdevsecret
```

## Smoke Test

Entra discovery and authorization URL preflight:

```bash
PRESENT_PUBLIC_URL=https://present.tc-waiblingen.de \
ENTRA_TENANT_ID=<tenant-id> \
ENTRA_CLIENT_ID=<client-id> \
ENTRA_CLIENT_SECRET=<client-secret> \
pnpm --filter @tcw/present preflight:entra
```

This verifies Microsoft discovery metadata and the exact PKCE authorization URL generated for `/api/auth/entra/callback`. It writes a JSON evidence report to `.tmp/entra-preflight-*.json` by default, or to `ENTRA_PREFLIGHT_OUTPUT_DIR` when set. For final production evidence, run it with the real tenant-specific Entra app values; `verify:production-evidence` rejects `common`, `organizations`, `consumers`, `{tenantid}`, `unknown`, and masked/dummy tenant or client IDs. It does not prove the client secret, redirect URI registration, or app-role assignment; the full manual browser sign-in still covers that.

Automated local smoke:

```bash
mise run livekit:up
PRESENT_DEV_AUTH=1 \
PRESENT_SESSION_SECRET=devsecretdevsecretdevsecretdev12 \
LIVEKIT_URL=ws://localhost:7880 \
LIVEKIT_API_KEY=devkey \
LIVEKIT_API_SECRET=devsecretdevsecretdevsecretdevsecret \
pnpm --filter @tcw/present dev
pnpm --filter @tcw/present smoke:local
```

The smoke script creates a temporary presentation, opens moderator and viewer pages in Chromium, starts screen sharing, verifies that the viewer receives a video track, and ends the presentation. On macOS, the browser process that captures the screen needs Screen Recording permission; Terminal or Codex launcher permission alone may not be enough. Restart both the launcher and the browser after changing that permission.

Each browser smoke writes a JSON evidence report to `.tmp/present-smoke-<code>.json` by default, or to `PRESENT_SMOKE_OUTPUT_DIR` when that environment variable is set. Keep the report from production runs with the deployment notes; it records the presentation code, ordered timestamps, elapsed runtime, auth mode, pre-live viewer waiting/token rejection, token-route LiveKit URLs, viewer count, media paths, protocol assertion result, credential leak check result, refresh checks, and end-state token rejection.

The default smoke uses Chromium auto-select flags so it can run unattended. If headless Chromium is still denied by macOS, run the same auto-select real-capture flow in a visible browser window:

```bash
pnpm --filter @tcw/present smoke:local:headed
```

To verify the actual browser-native picker, run the manual picker variant. The script waits up to five minutes for you to click `Start sharing`, choose a source in the picker, then click `Change screen` and choose the second source:

```bash
pnpm --filter @tcw/present smoke:local:native-picker
```

To test a specific Chromium-family browser, point `CHROMIUM_PATH` at its executable:

```bash
CHROMIUM_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium pnpm --filter @tcw/present smoke:local:native-picker
```

When macOS blocks real screen capture, use the test-only media-pipeline variant:

```bash
pnpm --filter @tcw/present smoke:local:fake-screen
```

This variant stubs `getDisplayMedia()` with Chromium fake video so it can verify LiveKit publishing/subscribing without the OS screen picker. It also verifies Stop, viewer return to waiting, restart sharing, `Change screen`, moderator end, viewer ended state, and viewer-token rejection after end. It does not replace the real screen-picker smoke test.

The default smoke includes the Stop/restart cycle. Native picker runs skip that extra cycle to avoid an additional manual picker prompt; set `PRESENT_SMOKE_STOP_RESTART=1` if you intentionally want to cover Stop/restart with the real picker.

To exercise local fan-out with the production target viewer count, run five isolated viewer sessions with fake screen media:

```bash
pnpm --filter @tcw/present smoke:local:five-viewers
```

This verifies five unique viewer logins before go-live, pre-live viewer waiting/token rejection, five LiveKit viewer participants, moderator-side viewer count, screen delivery to all viewers, resolved media paths for all viewers, `Change screen` delivery to all viewers, moderator end, viewer ended state, and viewer-token rejection after end. It does not replace the production non-LAN UDP/TCP fallback smoke.

To verify local browser refresh behavior:

```bash
pnpm --filter @tcw/present smoke:local:refresh
```

This reloads a viewer during an active share, verifies it reconnects and receives the screen, then reloads the moderator page, verifies LiveKit reconnection and viewer count, starts sharing again, and continues through `Change screen`.

To scan browser-visible responses for LiveKit credential leaks:

```bash
pnpm --filter @tcw/present smoke:local:secret-check
```

This creates a temporary presentation, fetches moderator/viewer page HTML, same-origin Next chunks, and moderator/viewer LiveKit token responses, then fails if `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY`, `apiSecret`, `apiKey`, or the configured secret value appears in those browser-visible responses. When testing a non-local secret, pass `PRESENT_SMOKE_SECRET_SCAN_VALUE=<secret>` to the command.

Production browser smoke with Entra:

```bash
PRESENT_SMOKE_SECRET_SCAN_VALUE=<livekit-api-secret> \
PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp \
pnpm --filter @tcw/present smoke:production:interactive
```

This opens headed Chromium at `https://present.tc-waiblingen.de/login?next=/presentations`, clicks the Microsoft login link, waits for a valid Entra moderator session, creates a temporary presentation, logs in five isolated viewers, opens their watch pages before go-live, verifies they wait without receiving a viewer token, verifies the moderator diagnostics, checks browser-visible pages/token responses for LiveKit credential leaks, records the LiveKit URL returned by both token routes, publishes fake screen media through the production LiveKit endpoint, verifies every viewer receives the stream, records the moderator `mediaPath` and each viewer's `viewerMediaPaths` such as `UDP host -> prflx` or a TCP fallback path, fails if the configured expected protocol does not match every media path, reloads one viewer and the moderator to verify refresh recovery, changes screen, and ends the temporary presentation. It uses fake screen media so the test can run after login without repeatedly opening the browser picker; it verifies the production WebRTC media path but not the picker itself. The report records non-secret marker counts as `secretCredentialMarkersScanned` and `secretValueMarkersScanned`; keep `secretValueMarkersScanned >= 1` by passing `PRESENT_SMOKE_SECRET_SCAN_VALUE`.

Production real-picker smoke with Entra:

```bash
PRESENT_SMOKE_SECRET_SCAN_VALUE=<livekit-api-secret> \
pnpm --filter @tcw/present smoke:production:native-picker
```

This uses the same production app and Entra login path but keeps Chromium headed and waits for manual `Start sharing` and `Change screen` clicks plus the browser-native picker selections. It verifies pre-live viewer waiting/token rejection and the real screen-picking flow with one viewer, then writes the same `.tmp/present-smoke-<code>.json` evidence report. Use the five-viewer fake-screen production smoke above for repeatable fan-out, refresh, and UDP/TCP protocol assertions.

Validate the production evidence bundle:

```bash
cp infra/livekit/production-manual-evidence.example.json .tmp/production-manual-evidence.json

pnpm --filter @tcw/present verify:production-evidence -- \
  --entra .tmp/entra-preflight-<tenant>-<client>.json \
  --endpoint .tmp/livekit-endpoint-preflight-<room>.json \
  --browser .tmp/present-smoke-<five-viewer-code>.json \
  --native .tmp/present-smoke-<native-picker-code>.json \
  --manual .tmp/production-manual-evidence.json \
  --protocol udp
```

Fill `.tmp/production-manual-evidence.json` before validating it. The template starts as `pending` and must fail until real tester, timestamp, browser-version, physical QR expected/scanned URL, and network evidence values are entered. Browser report validation fails unless `--protocol udp` or `--protocol tcp` is provided; use `--protocol tcp` for the TCP fallback run. The validator checks that every automated report includes ordered ISO start/end timestamps, positive elapsed time, and its durable report path, with endpoint paths tied to the preflight room name and smoke paths tied to the presentation code. It also checks that the Entra report passed with tenant-specific production Entra values, the LiveKit endpoint used `wss://live.tc-waiblingen.de`, the endpoint API URL and TCP fallback host/port matched, the endpoint API key stayed masked, no endpoint token/secret fields were recorded, TCP fallback was reachable, the five-viewer browser smoke used the production app URL, used fake-screen auto picker mode, ran headed when using interactive Entra auth, proved viewers waited before live, proved pre-live viewer token rejection, both browser token routes returned the configured LiveKit URL, secret scanning passed with at least one secret-value marker scanned, refresh recovery passed, all media paths matched the requested protocol, and the real-picker report used headed native picker mode with a real screen capture, matching token-route LiveKit URLs, pre-live viewer proof, and its own secret scan. It also checks the manual evidence file for the physical printed QR scan, exact expected/scanned QR URL match, Chromium/Safari/Firefox viewer matrix, same-LAN media, non-LAN UDP media, TCP fallback if available, and the documented no-TURN limitation for restrictive networks. It requires interactive Entra auth in browser reports by default; pass `--allow-cookie-auth` only when the smoke used a moderator cookie copied from a real Entra session. Pass `--tcp-fallback-port <port>` to `verify:production-evidence` only if production does not use the default `7881`.

If you already have a moderator session cookie, skip the interactive login:

```bash
PRESENT_SMOKE_BASE_URL=https://present.tc-waiblingen.de \
PRESENT_SMOKE_MODERATOR_COOKIE='present_session=<cookie-value>' \
PRESENT_SMOKE_VIEWERS=5 \
PRESENT_SMOKE_SECRET_CHECK=1 \
PRESENT_SMOKE_SECRET_SCAN_VALUE=<livekit-api-secret> \
PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp \
PRESENT_SMOKE_FAKE_SCREEN=1 \
pnpm --filter @tcw/present smoke:local
```

Use `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=udp` from a non-LAN network to make the smoke fail unless the moderator publisher path and every viewer subscriber path use UDP. From a test network where UDP media is blocked but TCP is allowed, rerun the same command with `PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL=tcp` to prove LiveKit TCP fallback. Leave the variable unset when you only want to record the observed media paths.

To include the real browser-native picker against production, replace `PRESENT_SMOKE_FAKE_SCREEN=1` with `PRESENT_SMOKE_HEADLESS=0 PRESENT_SMOKE_NATIVE_PICKER=1`, then click `Start sharing`/`Change screen` in Chromium and choose sources when prompted. That run requires a desktop session and the browser's OS screen-recording permission.

To verify handout rendering and print export locally:

```bash
pnpm --filter @tcw/present smoke:local:handout
```

This creates a temporary presentation, opens the handout page as a moderator, decodes the rendered QR image and checks that it matches the exact viewer URL, fills the print-time password field, exports a PDF through Chromium, verifies that the PDF is non-empty with a valid PDF header, renders the first PDF page through `pdftoppm`, and decodes the QR from that PDF render. It does not replace a physical QR scan from printed paper.

LiveKit endpoint and credential preflight:

```bash
LIVEKIT_URL=ws://localhost:7880 \
LIVEKIT_API_KEY=devkey \
LIVEKIT_API_SECRET=devsecretdevsecretdevsecretdevsecret \
pnpm --filter @tcw/present smoke:livekit:endpoint
```

For production, use the deployed endpoint and its matching credentials:

```bash
LIVEKIT_URL=wss://live.tc-waiblingen.de \
LIVEKIT_API_KEY=<generated-key> \
LIVEKIT_API_SECRET=<generated-secret> \
pnpm --filter @tcw/present smoke:livekit:endpoint
```

This preflight verifies that the LiveKit TCP fallback port is reachable, creates/lists/deletes a disposable LiveKit room through the RoomService API, then opens a valid-token LiveKit signaling WebSocket for that room. It proves the endpoint, reverse proxy route, credentials, `/rtc` signaling path, and `7881/tcp` firewall route for server-side app operations and TCP fallback reachability. If the fallback port differs from `7881`, set `LIVEKIT_TCP_FALLBACK_PORT=<port>`. It writes a JSON evidence report to `.tmp/livekit-endpoint-preflight-<room>.json` by default, or to `LIVEKIT_PREFLIGHT_OUTPUT_DIR` when set. The report stores only a masked API key; `verify:production-evidence` rejects unmasked endpoint keys and token/secret-looking fields. It does not prove browser WebRTC media or direct UDP; keep the manual production smoke below for those checks.

Manual production smoke:

1. Start LiveKit.
2. Start `apps/present`.
3. Create a presentation.
4. Join as a viewer in another browser.
5. Open the moderator room.
6. Start browser screen sharing.
7. Confirm the viewer sees the shared screen.
8. Change screen and confirm the viewer stays connected.
9. Test from a non-LAN network and record whether direct UDP or LiveKit TCP fallback is used.

Do not add TURN while running this smoke test. Treat networks that block both direct UDP and TCP fallback as unsupported for the current phase.

## Backup

LiveKit stores no presentation state. Back up:

- `apps/present` SQLite database
- LiveKit configuration
- Coolify environment variables/secrets

## Upgrade

Upgrade LiveKit by changing the `livekit/livekit-server` image tag, redeploying, and repeating the smoke test.
