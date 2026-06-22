import { spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { join } from "path";

const require = createRequire(import.meta.url);

const baseUrl = process.env.PRESENT_SMOKE_BASE_URL || "http://localhost:3003";
const chromiumPath = process.env.CHROMIUM_PATH || findChromium();
const debugPort = Number(
  process.env.PRESENT_SMOKE_DEBUG_PORT ||
    9300 + Math.floor(Math.random() * 500),
);
const fakeScreen = process.env.PRESENT_SMOKE_FAKE_SCREEN === "1";
const handoutOnly = process.env.PRESENT_SMOKE_HANDOUT === "1";
const headless = process.env.PRESENT_SMOKE_HEADLESS !== "0";
const nativePicker = process.env.PRESENT_SMOKE_NATIVE_PICKER === "1";
const refreshSmoke = process.env.PRESENT_SMOKE_REFRESH === "1";
const secretCheck = process.env.PRESENT_SMOKE_SECRET_CHECK === "1";
const stopRestartSmoke =
  process.env.PRESENT_SMOKE_STOP_RESTART === "1" ||
  (process.env.PRESENT_SMOKE_STOP_RESTART !== "0" && !nativePicker);
const keepBrowserOnFailure =
  process.env.PRESENT_SMOKE_KEEP_BROWSER_ON_FAILURE === "1" ||
  (nativePicker && process.env.PRESENT_SMOKE_KEEP_BROWSER_ON_FAILURE !== "0");
const interactiveAuth = process.env.PRESENT_SMOKE_INTERACTIVE_AUTH === "1";
const moderatorCookieOverride = (
  process.env.PRESENT_SMOKE_MODERATOR_COOKIE || ""
).trim();
const authTimeoutMs = Number(
  process.env.PRESENT_SMOKE_AUTH_TIMEOUT_MS || 10 * 60_000,
);
const screenShareTimeoutMs = Number(
  process.env.PRESENT_SMOKE_SCREEN_TIMEOUT_MS ||
    (nativePicker ? 300_000 : 20_000),
);
const viewerTargetCount = readPositiveInteger("PRESENT_SMOKE_VIEWERS", 1);
const expectedMediaProtocol = readExpectedMediaProtocol();
const password = `Smoke-${Date.now()}`;
const code = `SMK-${Date.now().toString(36).slice(-6).toUpperCase()}`;
const title = `Local smoke ${code}`;
const outputDir = process.env.PRESENT_SMOKE_OUTPUT_DIR || ".tmp";
const startedAt = new Date();

const summary = {
  code,
  baseUrl,
  startedAt: startedAt.toISOString(),
  completedAt: null,
  elapsedMs: null,
  result: "running",
  chromiumPath,
  mode: handoutOnly ? "handout" : "screen-share",
  screenCaptureMode: fakeScreen ? "fake" : "real",
  pickerMode: nativePicker ? "native" : "auto",
  browserMode: headless ? "headless" : "headed",
  moderatorAuthMode: moderatorCookieOverride
    ? "cookie"
    : interactiveAuth
      ? "interactive"
      : "dev",
  viewerTargetCount,
  refreshMode: refreshSmoke,
  secretLeakCheck: secretCheck,
  secretCredentialMarkersScanned: 0,
  secretValueMarkersScanned: 0,
  stopRestartMode: stopRestartSmoke,
  expectedMediaProtocol,
  moderatorConnected: false,
  viewerConnected: false,
  viewerWaitingBeforeLive: false,
  viewerTokenRejectedBeforeLive: false,
  viewerCount: false,
  moderatorDiagnostics: false,
  moderatorLiveKitUrl: null,
  viewerLiveKitUrl: null,
  mediaPath: null,
  viewerMediaPaths: [],
  mediaProtocolMatched: expectedMediaProtocol ? false : null,
  screenPublished: false,
  viewerReceivedScreen: false,
  screenStopped: false,
  viewerReturnedToWaiting: false,
  screenRestarted: false,
  noLiveKitSecretLeak: false,
  viewerRefreshSurvived: false,
  moderatorRefreshSurvived: false,
  screenChanged: false,
  presentationEnded: false,
  viewerEnded: false,
  viewerTokenRejectedAfterEnd: false,
  handoutRendered: false,
  handoutQrDecoded: false,
  handoutPdfQrDecoded: false,
  handoutPdf: null,
  smokeReport: null,
  error: null,
};

let moderatorCookie = "";
let browser;
let browserWebSocketDebuggerUrl = "";
let browserSession;
let smokeCompleted = false;

async function main() {
  if (!chromiumPath) {
    throw new Error("Set CHROMIUM_PATH to a Chromium or Chrome executable");
  }
  if (interactiveAuth && headless) {
    throw new Error(
      "PRESENT_SMOKE_INTERACTIVE_AUTH=1 requires PRESENT_SMOKE_HEADLESS=0",
    );
  }

  try {
    await assertAppHealth();
    moderatorCookie = await createModeratorSession();
    await createPresentation();
    if (handoutOnly) {
      if (!browser) browser = await launchChromium();
      await verifyHandout();
      completeSmoke();
      smokeCompleted = true;
      return;
    }

    const viewerCookies = await Promise.all(
      Array.from({ length: viewerTargetCount }, () => createViewerSession()),
    );
    await assertViewerTokenRejectedBeforeLive(viewerCookies[0]);
    summary.viewerTokenRejectedBeforeLive = true;

    if (!browser) browser = await launchChromium();
    const viewers = [];
    for (const viewerCookie of viewerCookies) {
      viewers.push(
        await openPage(`${baseUrl}/p/${code}/watch`, [viewerCookie], {
          browserContextId: await createBrowserContext(),
        }),
      );
    }
    for (const viewer of viewers) {
      await waitForText(viewer, /Waiting for the moderator to share a screen/i);
    }
    summary.viewerWaitingBeforeLive = true;

    await goLive();
    const moderator = await openPage(`${baseUrl}/moderator/${code}`, [
      moderatorCookie,
    ]);

    await waitForText(moderator, /Start sharing/);
    await waitForText(moderator, /Connection\s+connected/i);
    await waitForModeratorDiagnostics(moderator);
    summary.moderatorConnected = true;
    summary.moderatorDiagnostics = true;

    for (const viewer of viewers) {
      await waitForText(viewer, /Waiting for the moderator to share a screen/i);
      await waitForText(viewer, /connected/i);
    }
    summary.viewerConnected = true;

    if (secretCheck) {
      await assertNoLiveKitSecretLeak(viewerCookies[0]);
      summary.noLiveKitSecretLeak = true;
    }

    await waitForText(moderator, new RegExp(`Viewers\\s+${viewerTargetCount}`));
    summary.viewerCount = true;

    await requestScreenShareAction(moderator, "Start sharing");
    await waitForText(moderator, /Screen share active/i, screenShareTimeoutMs);
    summary.mediaPath = await waitForModeratorMediaPath(moderator);
    summary.screenPublished = true;

    for (const viewer of viewers) {
      await waitForViewerVideo(viewer);
      summary.viewerMediaPaths.push(await waitForViewerMediaPath(viewer));
    }
    assertExpectedMediaProtocol();
    summary.viewerReceivedScreen = true;

    if (stopRestartSmoke) {
      await clickButton(moderator, "Stop");
      await waitForText(moderator, /No screen shared/i);
      summary.screenStopped = true;

      for (const viewer of viewers) {
        await waitForText(
          viewer,
          /Waiting for the moderator to share a screen/i,
          20_000,
        );
      }
      summary.viewerReturnedToWaiting = true;

      await requestScreenShareAction(moderator, "Start sharing");
      await waitForText(
        moderator,
        /Screen share active/i,
        screenShareTimeoutMs,
      );
      for (const viewer of viewers) {
        await waitForViewerVideo(viewer);
      }
      summary.screenRestarted = true;
    }

    if (refreshSmoke) {
      await reloadPage(viewers[0]);
      await waitForText(viewers[0], /connected/i);
      await waitForViewerVideo(viewers[0]);
      summary.viewerRefreshSurvived = true;

      await reloadPage(moderator);
      await waitForText(moderator, /Start sharing/);
      await waitForText(moderator, /Connection\s+connected/i);
      await waitForText(
        moderator,
        new RegExp(`Viewers\\s+${viewerTargetCount}`),
      );
      await requestScreenShareAction(moderator, "Start sharing");
      await waitForText(
        moderator,
        /Screen share active/i,
        screenShareTimeoutMs,
      );
      for (const viewer of viewers) {
        await waitForViewerVideo(viewer);
      }
      summary.moderatorRefreshSurvived = true;
    }

    await requestScreenShareAction(moderator, "Change screen");
    await delay(500);
    await waitForText(moderator, /Screen share active/i, screenShareTimeoutMs);
    for (const viewer of viewers) {
      await waitForViewerVideo(viewer);
    }
    summary.screenChanged = true;

    await clickButton(moderator, "End");
    await waitForText(moderator, /Status\s+ended/i);
    summary.presentationEnded = true;

    for (const viewer of viewers) {
      await waitForText(viewer, /Presentation has ended\./i, 20_000);
    }
    summary.viewerEnded = true;

    await assertViewerTokenRejectedAfterEnd(viewerCookies[0]);
    summary.viewerTokenRejectedAfterEnd = true;

    completeSmoke();
    smokeCompleted = true;
  } catch (error) {
    recordSmokeFailure(error);
    throw error;
  } finally {
    if (browser && (!keepBrowserOnFailure || smokeCompleted)) {
      browser.kill("SIGTERM");
    } else if (browser) {
      browser.stdout?.destroy();
      browser.stderr?.destroy();
      browser.unref();
      console.error(
        "Leaving Chromium open because the smoke failed in native-picker mode.",
      );
    }
    if (moderatorCookie && !summary.presentationEnded) {
      await fetch(`${baseUrl}/api/presentations/${code}/end`, {
        method: "POST",
        headers: { cookie: moderatorCookie },
      }).catch(() => undefined);
    }
  }
}

function completeSmoke() {
  summary.completedAt = new Date().toISOString();
  summary.elapsedMs = Math.max(1, Date.now() - startedAt.getTime());
  summary.result = "passed";
  writeSmokeReport();
  console.log(JSON.stringify(summary, null, 2));
}

function recordSmokeFailure(error) {
  summary.completedAt = new Date().toISOString();
  summary.elapsedMs = Math.max(1, Date.now() - startedAt.getTime());
  summary.result = "failed";
  summary.error = formatError(error);
  try {
    writeSmokeReport();
  } catch (reportError) {
    console.error(`Could not write smoke report: ${formatError(reportError)}`);
  }
}

function writeSmokeReport() {
  mkdirSync(outputDir, { recursive: true });
  const path = join(outputDir, `present-smoke-${code}.json`);
  summary.smokeReport = { path };
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`);
}

async function verifyHandout() {
  const handout = await openPage(`${baseUrl}/presentations/${code}/handout`, [
    moderatorCookie,
  ]);
  await waitForText(handout, new RegExp(title));
  const viewerUrl = `${baseUrl}/p/${code}`;
  await waitForText(handout, new RegExp(escapeRegExp(viewerUrl)));
  await waitForText(handout, new RegExp(code));
  await verifyHandoutQr(handout, viewerUrl);
  summary.handoutQrDecoded = true;
  const passwordInputFound = await handout.evaluate((value) => {
    const input = document.querySelector(
      'input[aria-label="Viewer password for printed handout"]',
    );
    if (!(input instanceof HTMLInputElement)) return false;
    input.value = value;
    input.setAttribute("value", value);
    return true;
  }, password);
  if (!passwordInputFound) throw new Error("Handout password input not found");
  summary.handoutRendered = true;

  const printed = await handout.send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
  });
  const pdf = Buffer.from(printed.data, "base64");
  if (pdf.length < 10_000 || pdf.toString("ascii", 0, 5) !== "%PDF-") {
    throw new Error(`Handout PDF did not look valid (${pdf.length} bytes)`);
  }
  mkdirSync(outputDir, { recursive: true });
  const path = join(outputDir, `present-handout-${code}.pdf`);
  writeFileSync(path, pdf);
  await verifyHandoutPdfQr(path, viewerUrl);
  summary.handoutPdfQrDecoded = true;
  summary.handoutPdf = { path, bytes: pdf.length };
}

async function verifyHandoutQr(page, expectedValue) {
  const jsQrSource = readFileSync(require.resolve("jsqr"), "utf8");
  await page.send("Runtime.evaluate", { expression: jsQrSource });
  const decoded = await page.evaluate(async () => {
    const img = document.querySelector('img[alt^="QR code for "]');
    if (!(img instanceof HTMLImageElement)) {
      return { ok: false, error: "QR image not found" };
    }
    await img.decode().catch(() => undefined);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return { ok: false, error: "Canvas context not available" };
    context.drawImage(img, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const result = globalThis.jsQR?.(imageData.data, width, height);
    return {
      ok: Boolean(result?.data),
      data: result?.data || "",
      width,
      height,
      alt: img.alt,
    };
  });
  if (!decoded.ok || decoded.data !== expectedValue) {
    throw new Error(
      `Handout QR decoded as ${JSON.stringify(decoded)}; expected ${expectedValue}`,
    );
  }
}

async function verifyHandoutPdfQr(pdfPath, expectedValue) {
  const pdftoppm = findPdftoppm();
  if (!pdftoppm) {
    throw new Error(
      "pdftoppm is required to decode the handout PDF QR; set PDFTOPPM_PATH",
    );
  }
  const outputPrefix = join(outputDir, `present-handout-${code}-page`);
  const ppmPath = `${outputPrefix}.ppm`;
  rmSync(ppmPath, { force: true });
  await runCommand(pdftoppm, [
    "-f",
    "1",
    "-l",
    "1",
    "-r",
    "220",
    "-singlefile",
    pdfPath,
    outputPrefix,
  ]);
  const image = parsePpm(readFileSync(ppmPath));
  const jsQR = require("jsqr");
  const decoded = jsQR(image.data, image.width, image.height);
  rmSync(ppmPath, { force: true });
  if (decoded?.data !== expectedValue) {
    throw new Error(
      `Handout PDF QR decoded as ${JSON.stringify(decoded?.data || null)}; expected ${expectedValue}`,
    );
  }
}

function parsePpm(buffer) {
  let offset = 0;
  function readToken() {
    while (offset < buffer.length) {
      const byte = buffer[offset];
      if (byte === 35) {
        while (offset < buffer.length && buffer[offset] !== 10) offset += 1;
      } else if (byte === 9 || byte === 10 || byte === 13 || byte === 32) {
        offset += 1;
      } else {
        break;
      }
    }
    const start = offset;
    while (offset < buffer.length) {
      const byte = buffer[offset];
      if (byte === 9 || byte === 10 || byte === 13 || byte === 32) break;
      offset += 1;
    }
    return buffer.toString("ascii", start, offset);
  }

  const magic = readToken();
  const width = Number(readToken());
  const height = Number(readToken());
  const maxValue = Number(readToken());
  while (offset < buffer.length && [9, 10, 13, 32].includes(buffer[offset])) {
    offset += 1;
  }
  if (magic !== "P6" || !width || !height || maxValue !== 255) {
    throw new Error(
      `Unsupported PPM header ${magic} ${width} ${height} ${maxValue}`,
    );
  }

  const rgb = buffer.subarray(offset);
  if (rgb.length < width * height * 3) {
    throw new Error(`PPM payload too short: ${rgb.length} bytes`);
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (
    let source = 0, target = 0;
    target < data.length;
    source += 3, target += 4
  ) {
    data[target] = rgb[source];
    data[target + 1] = rgb[source + 1];
    data[target + 2] = rgb[source + 2];
    data[target + 3] = 255;
  }
  return { width, height, data };
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${command} exited with ${code}: ${stderr.trim()}`));
    });
  });
}

async function assertAppHealth() {
  const response = await fetch(`${baseUrl}/api/health`);
  if (!response.ok)
    throw new Error(`/api/health failed with ${response.status}`);
  const body = await response.json();
  if (!body.ok) throw new Error(`/api/health returned ${JSON.stringify(body)}`);
}

async function createModeratorSession() {
  if (moderatorCookieOverride) {
    await assertModeratorSession(moderatorCookieOverride);
    return moderatorCookieOverride;
  }
  if (interactiveAuth) return createInteractiveModeratorSession();

  const response = await fetch(`${baseUrl}/api/auth/dev?next=/presentations`, {
    redirect: "manual",
  });
  if (response.status !== 303) {
    throw new Error(
      `dev auth failed with ${response.status}; start the app with PRESENT_DEV_AUTH=1`,
    );
  }
  return cookieHeader(response);
}

async function createInteractiveModeratorSession() {
  if (!browser) browser = await launchChromium();
  const page = await openPage(`${baseUrl}/login?next=/presentations`, []);
  const clicked = await page.evaluate(() => {
    const link = [...document.querySelectorAll("a")].find(
      (candidate) =>
        candidate.textContent?.trim() === "Mit Microsoft anmelden",
    );
    if (!(link instanceof HTMLAnchorElement)) return false;
    link.click();
    return true;
  });
  if (!clicked) throw new Error("Microsoft login link not found");

  console.error(
    `Complete Microsoft sign-in in the Chromium window. Waiting up to ${Math.round(
      authTimeoutMs / 1000,
    )}s for a valid moderator session...`,
  );

  let cookie = "";
  await waitFor(
    async () => {
      cookie = await cookieHeaderFromBrowser(page);
      if (!hasModeratorSessionCookie(cookie)) return false;
      return assertModeratorSession(cookie).then(
        () => true,
        (error) => ({ ok: false, error: error.message }),
      );
    },
    "interactive moderator login",
    authTimeoutMs,
  );
  return cookie;
}

async function assertModeratorSession(cookie) {
  if (!hasModeratorSessionCookie(cookie)) {
    throw new Error("Moderator cookie header does not include present_session");
  }
  const response = await fetch(`${baseUrl}/presentations/new`, {
    headers: { cookie },
    redirect: "manual",
  });
  if (!response.ok) {
    throw new Error(
      `moderator session rejected with ${response.status}; provide a fresh Entra moderator session`,
    );
  }
}

async function createPresentation() {
  const form = new FormData();
  form.set("title", title);
  form.set("code", code);
  form.set("viewerPassword", password);
  form.set("startsAt", "2026-06-21");

  const response = await fetch(`${baseUrl}/api/presentations`, {
    method: "POST",
    headers: { cookie: moderatorCookie },
    body: form,
    redirect: "manual",
  });
  if (response.status !== 303)
    throw new Error(`presentation create failed with ${response.status}`);
}

async function goLive() {
  const response = await fetch(`${baseUrl}/api/presentations/${code}/go-live`, {
    method: "POST",
    headers: { cookie: moderatorCookie },
  });
  if (!response.ok)
    throw new Error(
      `go live failed with ${response.status}: ${await response.text()}`,
    );
}

async function createViewerSession() {
  const form = new FormData();
  form.set("code", code);
  form.set("password", password);

  const response = await fetch(`${baseUrl}/api/viewer-login`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  if (response.status !== 303)
    throw new Error(`viewer login failed with ${response.status}`);
  return cookieHeader(response);
}

async function assertViewerTokenRejectedAfterEnd(viewerCookie) {
  const response = await fetch(`${baseUrl}/api/livekit/viewer-token`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: viewerCookie },
    body: JSON.stringify({ code }),
  });
  if (response.status !== 409) {
    throw new Error(
      `viewer token after end returned ${response.status}: ${await response.text()}`,
    );
  }
}

async function assertViewerTokenRejectedBeforeLive(viewerCookie) {
  const response = await fetch(`${baseUrl}/api/livekit/viewer-token`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: viewerCookie },
    body: JSON.stringify({ code }),
  });
  const text = await response.text();
  if (response.status !== 409 || !text.includes("Presentation is not live")) {
    throw new Error(
      `viewer token before live returned ${response.status}: ${text}`,
    );
  }
}

async function assertNoLiveKitSecretLeak(viewerCookie) {
  const sources = [];
  const moderatorPage = await fetchText(
    "moderator page",
    `${baseUrl}/moderator/${code}`,
    {
      headers: { cookie: moderatorCookie },
    },
  );
  const viewerPage = await fetchText(
    "viewer watch page",
    `${baseUrl}/p/${code}/watch`,
    {
      headers: { cookie: viewerCookie },
    },
  );
  sources.push(moderatorPage, viewerPage);

  const assetUrls = new Set([
    ...extractSameOriginAssetUrls(moderatorPage.text),
    ...extractSameOriginAssetUrls(viewerPage.text),
  ]);
  for (const url of assetUrls) {
    sources.push(await fetchText(`asset ${new URL(url).pathname}`, url));
  }

  const moderatorTokenResponse = await fetchText(
    "moderator token response",
    `${baseUrl}/api/livekit/moderator-token`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: moderatorCookie,
      },
      body: JSON.stringify({ code }),
    },
  );
  const viewerTokenResponse = await fetchText(
    "viewer token response",
    `${baseUrl}/api/livekit/viewer-token`,
    {
      method: "POST",
      headers: { "content-type": "application/json", cookie: viewerCookie },
      body: JSON.stringify({ code }),
    },
  );
  summary.moderatorLiveKitUrl = parseTokenLiveKitUrl(moderatorTokenResponse);
  summary.viewerLiveKitUrl = parseTokenLiveKitUrl(viewerTokenResponse);
  sources.push(moderatorTokenResponse, viewerTokenResponse);

  const markers = forbiddenLiveKitCredentialMarkers();
  summary.secretCredentialMarkersScanned = markers.length;
  summary.secretValueMarkersScanned = markers.filter(
    (marker) => marker.label === "LIVEKIT_API_SECRET value",
  ).length;

  for (const source of sources) {
    for (const marker of markers) {
      if (source.text.includes(marker.value)) {
        throw new Error(
          `LiveKit credential marker ${marker.label} leaked in ${source.label}`,
        );
      }
    }
  }
}

function parseTokenLiveKitUrl(source) {
  let parsed;
  try {
    parsed = JSON.parse(source.text);
  } catch {
    throw new Error(`${source.label} did not return JSON`);
  }
  if (typeof parsed.url !== "string" || parsed.url.trim() === "") {
    throw new Error(`${source.label} did not include a LiveKit URL`);
  }
  return parsed.url;
}

async function fetchText(label, url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${label} failed with ${response.status}: ${text.slice(0, 500)}`,
    );
  }
  return { label, url, text };
}

function extractSameOriginAssetUrls(html) {
  const urls = [];
  const base = new URL(baseUrl);
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], baseUrl);
    if (url.origin !== base.origin) continue;
    if (!url.pathname.startsWith("/_next/static/")) continue;
    urls.push(url.toString());
  }
  return urls;
}

function forbiddenLiveKitCredentialMarkers() {
  const values = [
    process.env.PRESENT_SMOKE_SECRET_SCAN_VALUE,
    process.env.LIVEKIT_API_SECRET,
    baseUrl.includes("localhost") ? "devsecretdevsecretdevsecretdevsecret" : "",
  ]
    .flatMap((value) => (value || "").split(","))
    .map((value) => value.trim())
    .filter(
      (value, index, values) =>
        value.length >= 8 && values.indexOf(value) === index,
    )
    .map((value) => ({ label: "LIVEKIT_API_SECRET value", value }));

  return [
    ...values,
    { label: "LIVEKIT_API_SECRET name", value: "LIVEKIT_API_SECRET" },
    { label: "apiSecret field", value: "apiSecret" },
    { label: "LIVEKIT_API_KEY name", value: "LIVEKIT_API_KEY" },
    { label: "apiKey field", value: "apiKey" },
  ];
}

async function launchChromium() {
  const userDataDir = join(outputDir, `chromium-${Date.now()}`);
  rmSync(userDataDir, { force: true, recursive: true });
  const chromiumHome = join(userDataDir, "home");
  mkdirSync(chromiumHome, { recursive: true });
  const args = [
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-breakpad",
    "--disable-crash-reporter",
    "--disable-crashpad",
    "--disable-dev-shm-usage",
    "--autoplay-policy=no-user-gesture-required",
    "--allow-http-screen-capture",
    `--unsafely-treat-insecure-origin-as-secure=${baseUrl}`,
    "about:blank",
  ];
  if (headless) args.unshift("--headless=new");
  if (!nativePicker) {
    args.splice(
      args.indexOf("--allow-http-screen-capture"),
      0,
      "--use-fake-ui-for-media-stream",
      "--enable-usermedia-screen-capturing",
      "--auto-select-desktop-capture-source=Entire screen",
    );
  }
  if (fakeScreen)
    args.splice(
      args.indexOf("--allow-http-screen-capture"),
      0,
      "--use-fake-device-for-media-stream",
    );
  const child = spawn(chromiumPath, args, {
    env: { ...process.env, HOME: chromiumHome },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitFor(
      async () => {
        if (child.exitCode !== null)
          throw new Error(`Chromium exited with ${child.exitCode}`);
        const response = await fetch(
          `http://127.0.0.1:${debugPort}/json/version`,
        ).catch(() => null);
        if (!response?.ok) return false;
        const version = await response.json();
        browserWebSocketDebuggerUrl = version.webSocketDebuggerUrl;
        return Boolean(response?.ok);
      },
      "Chromium DevTools",
      20_000,
    );
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${error.message}\nChromium stderr:\n${stderr.trim()}`);
  }

  child.on("exit", (code) => {
    if (code && code !== 0) console.error(stderr);
    rmSync(userDataDir, { force: true, recursive: true });
  });

  return child;
}

async function openPage(url, cookies, options = {}) {
  const target = options.browserContextId
    ? await createTarget(options.browserContextId)
    : await createDefaultTarget();
  const page = await CdpSession.connect(target.webSocketDebuggerUrl);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Network.enable");
  if (fakeScreen) {
    await page.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        (() => {
          const mediaDevices = navigator.mediaDevices;
          if (!mediaDevices || !mediaDevices.getUserMedia) return;
          Object.defineProperty(mediaDevices, 'getDisplayMedia', {
            configurable: true,
            value: () => mediaDevices.getUserMedia({ video: true, audio: false }),
          });
        })();
      `,
    });
  }
  for (const cookie of cookies.flatMap(parseCookieHeader)) {
    await page.send("Network.setCookie", { ...cookie, url: baseUrl });
  }
  await page.send("Page.navigate", { url });
  await waitForLoad(page);
  return page;
}

async function createDefaultTarget() {
  const response = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent("about:blank")}`,
    {
      method: "PUT",
    },
  );
  if (!response.ok)
    throw new Error(`Could not create Chrome target: ${response.status}`);
  return response.json();
}

async function createBrowserContext() {
  const session = await getBrowserSession();
  const result = await session.send("Target.createBrowserContext", {
    disposeOnDetach: true,
  });
  return result.browserContextId;
}

async function createTarget(browserContextId) {
  const session = await getBrowserSession();
  const target = await session.send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });
  return {
    id: target.targetId,
    webSocketDebuggerUrl: await targetWebSocketUrl(target.targetId),
  };
}

async function getBrowserSession() {
  if (!browserWebSocketDebuggerUrl) {
    throw new Error("Chromium browser DevTools URL was not discovered");
  }
  browserSession ??= await CdpSession.connect(browserWebSocketDebuggerUrl);
  return browserSession;
}

async function targetWebSocketUrl(targetId) {
  let webSocketDebuggerUrl = "";
  await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    if (!response.ok) return false;
    const targets = await response.json();
    const target = targets.find((candidate) => candidate.id === targetId);
    webSocketDebuggerUrl = target?.webSocketDebuggerUrl || "";
    return Boolean(webSocketDebuggerUrl);
  }, `Chrome target ${targetId}`);
  return webSocketDebuggerUrl;
}

async function waitForLoad(page) {
  await waitFor(async () => {
    const state = await page.evaluate(() => document.readyState);
    return state === "interactive" || state === "complete";
  }, "page load");
}

async function waitForText(page, pattern, timeoutMs = 15_000) {
  try {
    await waitFor(
      async () => {
        const text = await page.evaluate(() => document.body.innerText);
        return pattern.test(text);
      },
      `text ${pattern}`,
      timeoutMs,
    );
  } catch (error) {
    const text = await page
      .evaluate(() => document.body.innerText)
      .catch(() => "");
    throw new Error(`${error.message}\nPage text:\n${text.slice(0, 2000)}`);
  }
}

async function waitForModeratorDiagnostics(page) {
  const expectedRoom = `tcw-present-${code.toLowerCase()}`;
  try {
    await waitFor(
      async () => {
        const values = await readModeratorDiagnostics(page);
        if (!values) {
          return { ok: false, error: "Diagnostics section not found" };
        }
        const roomSid = values["Room SID"] || "";
        const quality = values.Quality || "";
        const screen = values.Screen || "";
        return {
          ok:
            values["Room name"] === expectedRoom &&
            roomSid !== "" &&
            roomSid !== "Pending" &&
            roomSid !== "Unavailable" &&
            /^(Unknown|Excellent|Good|Poor|Lost)$/.test(quality) &&
            screen === "Connected",
          values,
        };
      },
      "moderator diagnostics",
      20_000,
    );
  } catch (error) {
    const text = await page
      .evaluate(() => document.body.innerText)
      .catch(() => "");
    throw new Error(`${error.message}\nPage text:\n${text.slice(0, 2000)}`);
  }
}

async function waitForModeratorMediaPath(page) {
  let mediaPath = "";
  try {
    await waitFor(
      async () => {
        const values = await readModeratorDiagnostics(page);
        mediaPath = values?.["Media path"] || "";
        return {
          ok:
            Boolean(mediaPath) &&
            !/^(Waiting|Resolving|Unavailable)$/i.test(mediaPath),
          values,
        };
      },
      "moderator media path",
      20_000,
    );
    return mediaPath;
  } catch (error) {
    const text = await page
      .evaluate(() => document.body.innerText)
      .catch(() => "");
    throw new Error(`${error.message}\nPage text:\n${text.slice(0, 2000)}`);
  }
}

function readModeratorDiagnostics(page) {
  return page.evaluate(() => {
    const diagnostics = [...document.querySelectorAll("section")].find(
      (section) =>
        section.querySelector("h2")?.textContent?.trim() === "Diagnostics",
    );
    if (!diagnostics) return null;
    return Object.fromEntries(
      [...diagnostics.querySelectorAll("dl > div")].map((row) => [
        row.querySelector("dt")?.textContent?.trim() || "",
        row.querySelector("dd")?.textContent?.trim() || "",
      ]),
    );
  });
}

async function reloadPage(page) {
  await page.send("Page.reload", { ignoreCache: true });
  await delay(500);
  await waitForLoad(page);
}

async function clickButton(page, label) {
  const button = await page.evaluate((text) => {
    const button = [...document.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === text,
    );
    if (!(button instanceof HTMLButtonElement)) return { found: false };
    button.scrollIntoView({ block: "center", inline: "center" });
    const rect = button.getBoundingClientRect();
    return {
      found: true,
      disabled: button.disabled,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, label);
  if (!button.found) throw new Error(`Button not found: ${label}`);
  if (button.disabled) throw new Error(`Button disabled: ${label}`);

  await page.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: button.x,
    y: button.y,
    button: "none",
  });
  await page.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: button.x,
    y: button.y,
    button: "left",
    clickCount: 1,
  });
  await page.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: button.x,
    y: button.y,
    button: "left",
    clickCount: 1,
  });
}

async function requestScreenShareAction(page, label) {
  if (!nativePicker) {
    await clickButton(page, label);
    return;
  }

  await waitForText(page, new RegExp(escapeRegExp(label)));
  console.error(
    `Click "${label}" in Chromium and choose a screen/window. Waiting up to ${Math.round(
      screenShareTimeoutMs / 1000,
    )}s...`,
  );
}

async function waitForViewerVideo(page) {
  try {
    await waitFor(
      () =>
        page.evaluate(() => {
          const video = document.querySelector("video");
          return {
            ok: Boolean(video?.srcObject?.getVideoTracks?.().length),
            text: document.body.innerText,
            video: {
              hasSrcObject: Boolean(video?.srcObject),
              trackCount: video?.srcObject?.getVideoTracks?.().length ?? 0,
              readyState: video?.readyState ?? 0,
              width: video?.videoWidth ?? 0,
              height: video?.videoHeight ?? 0,
            },
          };
        }),
      "viewer video track",
      20_000,
    );
  } catch (error) {
    const debug = await page
      .evaluate(() => {
        const video = document.querySelector("video");
        return {
          text: document.body.innerText,
          video: {
            hasSrcObject: Boolean(video?.srcObject),
            trackCount: video?.srcObject?.getVideoTracks?.().length ?? 0,
            readyState: video?.readyState ?? 0,
            width: video?.videoWidth ?? 0,
            height: video?.videoHeight ?? 0,
          },
        };
      })
      .catch(() => null);
    throw new Error(
      `${error.message}\nViewer debug:\n${JSON.stringify(debug, null, 2)}`,
    );
  }
}

async function waitForViewerMediaPath(page) {
  let mediaPath = "";
  try {
    await waitFor(
      () =>
        page.evaluate(() => {
          const mediaPath = document.querySelector("main")?.dataset.mediaPath || "";
          return {
            ok:
              Boolean(mediaPath) &&
              !/^(Waiting|Resolving|Unavailable)$/i.test(mediaPath),
            mediaPath,
            text: document.body.innerText,
          };
        }),
      "viewer media path",
      20_000,
    );
    mediaPath = await page.evaluate(
      () => document.querySelector("main")?.dataset.mediaPath || "",
    );
    return mediaPath;
  } catch (error) {
    const debug = await page
      .evaluate(() => ({
        text: document.body.innerText,
        mediaPath: document.querySelector("main")?.dataset.mediaPath || "",
      }))
      .catch(() => null);
    throw new Error(
      `${error.message}\nViewer debug:\n${JSON.stringify(debug, null, 2)}`,
    );
  }
}

function assertExpectedMediaProtocol() {
  if (!expectedMediaProtocol) return;
  const paths = [summary.mediaPath, ...summary.viewerMediaPaths].filter(Boolean);
  const mismatches = paths.filter(
    (path) => !path.toUpperCase().startsWith(`${expectedMediaProtocol} `),
  );
  if (mismatches.length > 0 || paths.length !== viewerTargetCount + 1) {
    throw new Error(
      `Expected ${expectedMediaProtocol} media paths for moderator and ${viewerTargetCount} viewer(s), got: ${JSON.stringify(
        paths,
      )}`,
    );
  }
  summary.mediaProtocolMatched = true;
}

async function waitFor(check, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result === true || result?.ok === true) return;
      if (result) lastError = new Error(JSON.stringify(result));
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`,
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readPositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function readExpectedMediaProtocol() {
  const value = (
    process.env.PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL || ""
  ).trim();
  if (!value) return null;
  if (/^(udp|tcp)$/i.test(value)) return value.toUpperCase();
  throw new Error(
    "PRESENT_SMOKE_EXPECT_MEDIA_PROTOCOL must be unset, udp, or tcp",
  );
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function cookieHeader(response) {
  const cookies = setCookies(response);
  if (cookies.length === 0) throw new Error("Expected Set-Cookie header");
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function cookieHeaderFromBrowser(page) {
  const result = await page.send("Network.getCookies", { urls: [baseUrl] });
  return (result.cookies || [])
    .filter((cookie) => cookie.name && cookie.value)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function hasModeratorSessionCookie(header) {
  return parseCookieHeader(header).some(
    (cookie) => cookie.name === "present_session",
  );
}

function setCookies(response) {
  if (typeof response.headers.getSetCookie === "function")
    return response.headers.getSetCookie();
  const header = response.headers.get("set-cookie");
  if (!header) return [];
  return header.split(/,(?=\s*[^=;,\s]+=)/);
}

function parseCookieHeader(header) {
  return header
    .split(/;\s*/)
    .map((part) => {
      const [name, ...rest] = part.split("=");
      return { name, value: rest.join("=") };
    })
    .filter((cookie) => cookie.name && cookie.value);
}

function findChromium() {
  const candidates = [
    "/opt/homebrew/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function findPdftoppm() {
  const configured = process.env.PDFTOPPM_PATH;
  if (configured) return configured;
  const candidates = [
    "/opt/homebrew/bin/pdftoppm",
    "/usr/local/bin/pdftoppm",
    "/usr/bin/pdftoppm",
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.onmessage = (event) => this.handleMessage(event.data);
    socket.onerror = () => undefined;
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
    return new CdpSession(socket);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async evaluate(fn, ...args) {
    const expression = `(${fn})(${args.map((arg) => JSON.stringify(arg)).join(",")})`;
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result?.value;
  }

  handleMessage(raw) {
    const message = JSON.parse(raw);
    if (!message.id) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
  }
}

await main();
