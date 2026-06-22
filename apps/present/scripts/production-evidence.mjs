import { readFileSync } from "fs";
import { parseArgs } from "util";

const args = process.argv.slice(2);
if (args[0] === "--") args.shift();

const { values } = parseArgs({
  args,
  options: {
    "allow-cookie-auth": { type: "boolean", default: false },
    "allow-dev-auth": { type: "boolean", default: false },
    "allow-partial": { type: "boolean", default: false },
    "base-url": {
      type: "string",
      default: "https://present.tc-waiblingen.de",
    },
    browser: { type: "string" },
    endpoint: { type: "string" },
    entra: { type: "string" },
    health: { type: "string" },
    "livekit-url": {
      type: "string",
      default: "wss://live.tc-waiblingen.de",
    },
    manual: { type: "string" },
    native: { type: "string" },
    protocol: { type: "string" },
    "tcp-fallback-port": { type: "string", default: "7881" },
  },
});

const requiredReports = ["health", "entra", "endpoint", "browser", "native", "manual"];
const failures = [];
const notes = [];

for (const report of requiredReports) {
  if (!values[report]) {
    const message = `Missing --${report} report path`;
    if (values["allow-partial"]) notes.push(message);
    else failures.push(message);
  }
}

const expectedProtocol = normalizeProtocol(values.protocol);
const expectedTcpFallbackPort = normalizeTcpFallbackPort(
  values["tcp-fallback-port"],
);
const reports = {
  health: readReport("health", values.health),
  entra: readReport("entra", values.entra),
  endpoint: readReport("endpoint", values.endpoint),
  browser: readReport("browser", values.browser),
  native: readReport("native", values.native),
  manual: readReport("manual", values.manual),
};

if (reports.health) validateHealthReport(reports.health);
if (reports.entra) validateEntraReport(reports.entra);
if (reports.endpoint) validateEndpointReport(reports.endpoint);
if (reports.browser) validateBrowserReport(reports.browser);
if (reports.native) validateNativePickerReport(reports.native);
if (reports.manual) validateManualReport(reports.manual);

if (failures.length > 0) {
  console.error("Production evidence validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (notes.length > 0) {
    console.error("\nSkipped checks:");
    for (const note of notes) console.error(`- ${note}`);
  }
  process.exit(1);
}

const checked = Object.entries(reports)
  .filter(([, report]) => Boolean(report))
  .map(([name, report]) => `${name}:${report.result || "unknown"}`)
  .join(", ");

console.log(
  `Production evidence validation passed${checked ? ` (${checked})` : ""}.`,
);
if (notes.length > 0) {
  console.log("Skipped checks:");
  for (const note of notes) console.log(`- ${note}`);
}

function readReport(label, path) {
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    failures.push(`Could not read --${label} report ${path}: ${error.message}`);
    return null;
  }
}

function validateHealthReport(report) {
  assertEqual("Health preflight result", report.result, "passed");
  assertAutomatedReportMetadata(report, "Health preflight", "healthReport");
  assertEqual("Health base URL", report.baseUrl, values["base-url"]);
  const expectedHealthUrl = healthUrlForBaseUrl(values["base-url"]);
  if (expectedHealthUrl) {
    assertEqual("Health URL", report.healthUrl, expectedHealthUrl);
  }
  assertEqual("Health status", report.status, 200);
  assertTrue("Health ok", report.ok);
  assertTrue("Health body ok", report.body?.ok);
  assertTrue("Health database ok", report.body?.database?.ok);
  assertTrue("Health LiveKit configured", report.body?.livekit?.configured);
  assertTrue("Health auth ready", report.body?.auth?.ready);

  if (!isLocalBaseUrl()) {
    assertTrue("Health LiveKit required", report.body?.livekit?.required);
    assertTrue("Health LiveKit URL uses WSS", report.body?.livekit?.urlUsesWss);
    assertTrue("Health auth required", report.body?.auth?.required);
    assertTrue("Health public URL uses HTTPS", report.body?.auth?.publicUrlUsesHttps);
    assertTrue("Health Entra tenant-specific", report.body?.auth?.entraTenantSpecific);
  }

  assertNoHealthSensitiveValues(report);
}

function validateEntraReport(report) {
  assertEqual("Entra result", report.result, "passed");
  assertAutomatedReportMetadata(report, "Entra", "preflightReport");
  assertMaskedProductionId("Entra tenant ID", report.tenantId);
  assertMaskedProductionId("Entra client ID", report.clientId);
  assertTenantSpecificMicrosoftUrl("Entra issuer", report.issuer);
  assertTenantSpecificMicrosoftUrl(
    "Entra authorization endpoint",
    report.authorizationEndpoint,
  );
  assertTenantSpecificMicrosoftUrl("Entra token endpoint", report.tokenEndpoint);
  assertTenantSpecificMicrosoftUrl("Entra JWKS URI", report.jwksUri);
  assertEqual("Entra public URL", report.publicUrl, values["base-url"]);
  assertEqual(
    "Entra redirect URI",
    report.redirectUri,
    `${values["base-url"]}/api/auth/entra/callback`,
  );
  assertAllChecksPassed("Entra", report.checks);
}

function validateEndpointReport(report) {
  assertEqual("LiveKit endpoint result", report.result, "passed");
  assertAutomatedReportMetadata(report, "LiveKit endpoint", "preflightReport");
  assertNonPlaceholder("LiveKit preflight room name", report.roomName);
  assertReportPathIncludes(
    "LiveKit endpoint report path",
    report.preflightReport?.path,
    "room name",
    report.roomName,
  );
  assertEqual("LiveKit URL", report.liveKitUrl, values["livekit-url"]);
  assertEqual(
    "LiveKit API URL",
    report.apiUrl,
    liveKitApiUrl(values["livekit-url"]),
  );
  assertEndpointApiKeyMasked(report.apiKey);
  assertNoEndpointSensitiveValues(report);
  assertEqual(
    "LiveKit TCP fallback host",
    report.tcpFallbackHost,
    liveKitHost(values["livekit-url"]),
  );
  if (expectedTcpFallbackPort !== null) {
    assertEqual(
      "LiveKit TCP fallback port",
      report.tcpFallbackPort,
      expectedTcpFallbackPort,
    );
  }
  assertTrue("LiveKit room created", report.created);
  assertTrue("LiveKit room listed", report.listed);
  assertTrue("LiveKit signaling connected", report.signalingConnected);
  assertTrue("LiveKit TCP fallback reachable", report.tcpFallbackReachable);
  assertTrue("LiveKit disposable room deleted", report.deleted);
}

function validateBrowserReport(report) {
  assertScreenShareReport(report, "Production browser smoke");
  assertAutomatedReportMetadata(report, "Production browser smoke", "smokeReport");
  assertNonPlaceholder("Browser presentation code", report.code);
  assertReportPathIncludes(
    "Browser smoke report path",
    report.smokeReport?.path,
    "presentation code",
    report.code,
  );
  assertEqual("Browser base URL", report.baseUrl, values["base-url"]);
  assertModeratorAuth(report, "Production browser smoke");
  assertEqual("Browser screen capture mode", report.screenCaptureMode, "fake");
  assertEqual("Browser picker mode", report.pickerMode, "auto");
  if (report.moderatorAuthMode === "interactive") {
    assertEqual("Browser interactive mode", report.browserMode, "headed");
  } else {
    assertNonPlaceholder("Browser mode", report.browserMode);
  }
  assertLiveKitTokenUrls(report, "Browser");
  assertMinimum("Browser viewer count", report.viewerTargetCount, 5);
  assertTrue("Browser refresh mode", report.refreshMode);
  assertSecretLeakScan(report, "Browser");
  assertTrue("Browser viewer refresh survived", report.viewerRefreshSurvived);
  assertTrue(
    "Browser moderator refresh survived",
    report.moderatorRefreshSurvived,
  );
  assertTrue("Browser stop/restart enabled", report.stopRestartMode);
  assertTrue("Browser screen stopped", report.screenStopped);
  assertTrue("Browser viewer returned to waiting", report.viewerReturnedToWaiting);
  assertTrue("Browser screen restarted", report.screenRestarted);
  assertEqual(
    "Browser viewer media path count",
    report.viewerMediaPaths?.length,
    report.viewerTargetCount,
  );
  assertMediaPaths(report, "Browser");

  if (!expectedProtocol) {
    failures.push("Browser media protocol requires --protocol udp or tcp");
    return;
  }

  assertEqual(
    "Browser expected media protocol",
    report.expectedMediaProtocol,
    expectedProtocol,
  );
  assertTrue("Browser media protocol matched", report.mediaProtocolMatched);
  assertProtocol("Browser moderator media path", report.mediaPath);
  for (const [index, mediaPath] of report.viewerMediaPaths.entries()) {
    assertProtocol(`Browser viewer ${index + 1} media path`, mediaPath);
  }
}

function validateNativePickerReport(report) {
  assertScreenShareReport(report, "Production native-picker smoke");
  assertAutomatedReportMetadata(report, "Production native-picker smoke", "smokeReport");
  assertNonPlaceholder("Native picker presentation code", report.code);
  assertReportPathIncludes(
    "Native picker smoke report path",
    report.smokeReport?.path,
    "presentation code",
    report.code,
  );
  assertEqual("Native picker base URL", report.baseUrl, values["base-url"]);
  assertModeratorAuth(report, "Production native-picker smoke");
  assertEqual("Native picker screen capture mode", report.screenCaptureMode, "real");
  assertEqual("Native picker mode", report.pickerMode, "native");
  assertEqual("Native picker browser mode", report.browserMode, "headed");
  assertLiveKitTokenUrls(report, "Native picker");
  assertMinimum("Native picker viewer count", report.viewerTargetCount, 1);
  assertSecretLeakScan(report, "Native picker");
  assertMediaPaths(report, "Native picker");
}

function validateManualReport(report) {
  assertEqual("Manual evidence result", report.result, "passed");
  assertEqual("Manual evidence base URL", report.baseUrl, values["base-url"]);
  assertIsoDate("Manual evidence testedAt", report.testedAt);
  assertNonPlaceholder("Manual evidence testedBy", report.testedBy);

  const physicalQr = report.physicalQrScan;
  assertNonPlaceholder(
    "Physical QR presentation code",
    physicalQr?.presentationCode,
  );
  const expectedQrUrl = viewerUrlForCode(
    values["base-url"],
    physicalQr?.presentationCode,
  );
  assertNonPlaceholder("Physical QR expected URL", physicalQr?.expectedUrl);
  assertNonPlaceholder("Physical QR scanned URL", physicalQr?.scannedUrl);
  if (expectedQrUrl) {
    assertEqual("Physical QR expected URL", physicalQr?.expectedUrl, expectedQrUrl);
    assertEqual("Physical QR scanned URL", physicalQr?.scannedUrl, expectedQrUrl);
  }
  assertTrue("Physical QR handout printed", physicalQr?.handoutPrinted);
  assertTrue("Physical QR scanned from paper", physicalQr?.scannedFromPaper);
  assertTrue("Physical QR URL matched handout URL", physicalQr?.urlMatched);
  assertTrue("Physical QR opened viewer page", physicalQr?.openedViewerPage);
  assertTrue("Physical QR viewer password worked", physicalQr?.passwordWorked);
  assertTrue(
    "Physical QR viewer login stayed password-only",
    physicalQr?.passwordOnlyLogin,
  );

  assertManualBrowser("Chromium");
  assertManualBrowser("Safari");
  assertManualBrowser("Firefox");

  assertManualNetwork("same-lan", { requirePassed: true });
  assertManualNetwork("non-lan-udp", {
    requirePassed: true,
    protocol: "UDP",
  });
  assertManualNetwork("tcp-fallback", {
    allowNotAvailable: true,
    protocol: "TCP",
  });
  assertManualNetwork("restrictive-network", {
    allowNotAvailable: true,
    allowUnsupported: true,
  });

  if (Array.isArray(report.notes)) {
    for (const [index, note] of report.notes.entries()) {
      assertNonPlaceholder(`Manual note ${index + 1}`, note);
      assertNoManualSensitiveValue(`Manual note ${index + 1}`, note);
    }
  } else if (report.notes !== undefined) {
    failures.push("Manual notes must be an array");
  }
}

function assertManualBrowser(browserName) {
  const check = findNamedCheck(
    "Manual browser matrix",
    reports.manual?.browserMatrix,
    browserName,
  );
  if (!check) return;
  assertNonPlaceholder(`${browserName} browser version`, check.version);
  assertEqual(`${browserName} browser role`, check.role, "viewer");
  assertTrue(`${browserName} browser check passed`, check.passed);
  assertTrue(`${browserName} viewer opened QR URL`, check.openedQrUrl);
  assertTrue(`${browserName} password-only viewer login`, check.passwordOnlyLogin);
  assertTrue(`${browserName} waiting state`, check.waitingState);
  assertTrue(`${browserName} screen received`, check.screenReceived);
  assertTrue(`${browserName} change-screen received`, check.changeScreenReceived);
  assertTrue(`${browserName} ended state`, check.endedState);
}

function assertManualNetwork(name, options) {
  const check = findNamedCheck(
    "Manual network checks",
    reports.manual?.networkChecks,
    name,
  );
  if (!check) return;

  if (check.status === "passed") {
    if (options.protocol) {
      assertNonPlaceholder(`${name} observed protocol`, check.observedProtocol);
      assertEqual(
        `${name} observed protocol`,
        normalizeProtocol(check.observedProtocol),
        options.protocol,
      );
    }
    assertTrue(`${name} moderator media observed`, check.moderatorMediaObserved);
    assertTrue(`${name} viewer media observed`, check.viewerMediaObserved);
    return;
  }

  if (check.status === "not_available" && options.allowNotAvailable) {
    assertNonPlaceholder(`${name} not-available reason`, check.reason);
    notes.push(`${name} was not available: ${check.reason}`);
    return;
  }

  if (check.status === "unsupported" && options.allowUnsupported) {
    assertNonPlaceholder(`${name} unsupported reason`, check.reason);
    assertTrue(`${name} TURN limitation documented`, check.turnLimitationDocumented);
    notes.push(`${name} is unsupported without TURN: ${check.reason}`);
    return;
  }

  const allowed = ["passed"];
  if (options.allowNotAvailable) allowed.push("not_available");
  if (options.allowUnsupported) allowed.push("unsupported");
  failures.push(
    `${name} status must be ${allowed.join(" or ")}, got ${JSON.stringify(
      check.status,
    )}`,
  );
}

function assertScreenShareReport(report, label) {
  assertEqual(`${label} result`, report.result, "passed");
  assertEqual(`${label} mode`, report.mode, "screen-share");
  assertTrue(`${label} moderator connected`, report.moderatorConnected);
  assertTrue(`${label} viewer connected`, report.viewerConnected);
  assertTrue(`${label} viewer waited before live`, report.viewerWaitingBeforeLive);
  assertTrue(
    `${label} viewer token rejected before live`,
    report.viewerTokenRejectedBeforeLive,
  );
  assertTrue(`${label} viewer count`, report.viewerCount);
  assertTrue(`${label} moderator diagnostics`, report.moderatorDiagnostics);
  assertTrue(`${label} screen published`, report.screenPublished);
  assertTrue(`${label} viewer received screen`, report.viewerReceivedScreen);
  assertTrue(`${label} screen changed`, report.screenChanged);
  assertTrue(`${label} presentation ended`, report.presentationEnded);
  assertTrue(`${label} viewer ended`, report.viewerEnded);
  assertTrue(
    `${label} viewer token rejected after end`,
    report.viewerTokenRejectedAfterEnd,
  );
}

function assertModeratorAuth(report, label) {
  if (report.moderatorAuthMode === "interactive") return;
  if (report.moderatorAuthMode === "cookie" && values["allow-cookie-auth"]) {
    notes.push(`${label} used a copied moderator cookie`);
    return;
  }
  if (report.moderatorAuthMode === "dev" && values["allow-dev-auth"]) {
    if (!isLocalBaseUrl()) {
      failures.push(`${label} dev auth is only allowed for local base URLs`);
      return;
    }
    notes.push(`${label} used dev auth`);
    return;
  }
  failures.push(
    `${label} must use interactive Entra auth` +
      `; got ${JSON.stringify(report.moderatorAuthMode)}`,
  );
}

function assertMediaPaths(report, label) {
  assertResolvedMediaPath(`${label} moderator media path`, report.mediaPath);
  if (!Array.isArray(report.viewerMediaPaths)) {
    failures.push(`${label} viewer media paths must be an array`);
    return;
  }
  if (report.viewerMediaPaths.length < 1) {
    failures.push(`${label} must include at least one viewer media path`);
    return;
  }
  for (const [index, mediaPath] of report.viewerMediaPaths.entries()) {
    assertResolvedMediaPath(`${label} viewer ${index + 1} media path`, mediaPath);
  }
}

function assertSecretLeakScan(report, label) {
  assertTrue(`${label} secret leak check enabled`, report.secretLeakCheck);
  assertMinimum(
    `${label} secret credential markers scanned`,
    report.secretCredentialMarkersScanned,
    5,
  );
  assertMinimum(
    `${label} secret value markers scanned`,
    report.secretValueMarkersScanned,
    1,
  );
  assertTrue(`${label} no LiveKit secret leak`, report.noLiveKitSecretLeak);
}

function assertLiveKitTokenUrls(report, label) {
  assertEqual(
    `${label} moderator LiveKit URL`,
    report.moderatorLiveKitUrl,
    values["livekit-url"],
  );
  assertEqual(
    `${label} viewer LiveKit URL`,
    report.viewerLiveKitUrl,
    values["livekit-url"],
  );
}

function assertAllChecksPassed(label, checks) {
  if (!checks || typeof checks !== "object" || Array.isArray(checks)) {
    failures.push(`${label} checks must be an object`);
    return;
  }
  for (const [check, passed] of Object.entries(checks)) {
    assertTrue(`${label} ${check}`, passed);
  }
}

function assertAutomatedReportMetadata(report, label, pathField) {
  const startedAt = assertIsoDate(`${label} startedAt`, report.startedAt);
  const completedAt = assertIsoDate(`${label} completedAt`, report.completedAt);
  if (startedAt !== null && completedAt !== null && completedAt < startedAt) {
    failures.push(`${label} completedAt must not be before startedAt`);
  }
  assertMinimum(`${label} elapsedMs`, report.elapsedMs, 1);
  assertNonPlaceholder(`${label} report path`, report[pathField]?.path);
}

function assertReportPathIncludes(label, path, valueLabel, value) {
  if (typeof path !== "string" || typeof value !== "string") return;
  const normalizedValue = value.trim();
  if (!normalizedValue || path.includes(normalizedValue)) return;
  failures.push(
    `${label} must include ${valueLabel} ${JSON.stringify(normalizedValue)}`,
  );
}

function findNamedCheck(label, checks, name) {
  if (!Array.isArray(checks)) {
    failures.push(`${label} must be an array`);
    return null;
  }
  const check = checks.find(
    (candidate) =>
      typeof candidate?.name === "string" &&
      candidate.name.toLowerCase() === name.toLowerCase(),
  );
  if (!check) {
    failures.push(`${label} missing ${name}`);
    return null;
  }
  return check;
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    failures.push(
      `${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(
        actual,
      )}`,
    );
  }
}

function assertMinimum(label, actual, minimum) {
  if (typeof actual !== "number" || actual < minimum) {
    failures.push(`${label} expected >= ${minimum}, got ${JSON.stringify(actual)}`);
  }
}

function assertPresent(label, value) {
  if (typeof value !== "string" || value.trim() === "") {
    failures.push(`${label} must be present`);
  }
}

function assertResolvedMediaPath(label, value) {
  assertPresent(label, value);
  if (typeof value !== "string") return;
  if (/^(waiting|resolving|unavailable)$/i.test(value.trim())) {
    failures.push(`${label} must be resolved, got ${JSON.stringify(value)}`);
  }
}

function assertNonPlaceholder(label, value) {
  assertPresent(label, value);
  if (typeof value !== "string") return;
  const normalized = value.trim().toLowerCase();
  const placeholders = ["name", "replace", "example", "placeholder", "todo"];
  if (placeholders.some((placeholder) => normalized.includes(placeholder))) {
    failures.push(`${label} must be replaced, got ${JSON.stringify(value)}`);
  }
}

function assertNoManualSensitiveValue(label, value) {
  if (typeof value !== "string") return;
  const sensitivePatterns = [
    /present_session\s*=/i,
    /authorization\s*:\s*bearer\s+\S+/i,
    /\b(LIVEKIT_API_SECRET|ENTRA_CLIENT_SECRET|PRESENT_SESSION_SECRET)\s*=/i,
    /\b(apiSecret|client_secret)\s*[:=]\s*\S+/i,
    /\b(viewer[_\s-]?password|password|passcode|pwd)\s*[:=]\s*\S+/i,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./,
  ];
  if (sensitivePatterns.some((pattern) => pattern.test(value))) {
    failures.push(`${label} must not contain secrets, session cookies, or tokens`);
  }
}

function assertEndpointApiKeyMasked(value) {
  assertPresent("LiveKit API key mask", value);
  if (typeof value !== "string") return;
  if (value === "****" || /^[^.\s]{1,8}\.\.\.[^.\s]{1,8}$/.test(value)) {
    return;
  }
  failures.push("LiveKit API key must be masked in endpoint evidence");
}

function assertNoEndpointSensitiveValues(report) {
  const sensitivePaths = [];
  visitReport(report, [], (path, value) => {
    const name = path[path.length - 1] || "";
    const text = typeof value === "string" ? value : "";
    if (
      /^(apiSecret|accessToken|token|jwt)$/i.test(name) ||
      /access_token=/i.test(text) ||
      /\b(LIVEKIT_API_SECRET|apiSecret)\b/i.test(text) ||
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(text)
    ) {
      sensitivePaths.push(path.join("."));
    }
  });
  if (sensitivePaths.length > 0) {
    failures.push(
      `LiveKit endpoint evidence must not contain secrets or tokens: ${sensitivePaths.join(
        ", ",
      )}`,
    );
  }
}

function assertNoHealthSensitiveValues(report) {
  const sensitivePaths = [];
  visitReport(report, [], (path, value) => {
    const text = typeof value === "string" ? value : "";
    if (
      /present_session\s*=/i.test(text) ||
      /authorization\s*:\s*bearer\s+\S+/i.test(text) ||
      /\b(LIVEKIT_API_SECRET|LIVEKIT_API_KEY|ENTRA_CLIENT_SECRET|PRESENT_SESSION_SECRET)\s*=/i.test(text) ||
      /\b(apiSecret|apiKey|client_secret|clientSecret|sessionSecret|password|token)\s*[:=]\s*\S+/i.test(text) ||
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(text)
    ) {
      sensitivePaths.push(path.join("."));
    }
  });
  if (sensitivePaths.length > 0) {
    failures.push(
      `Health evidence must not contain secrets, session cookies, or tokens: ${sensitivePaths.join(
        ", ",
      )}`,
    );
  }
}

function assertMaskedProductionId(label, value) {
  assertNonPlaceholder(label, value);
  if (typeof value !== "string") return;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "****" ||
    normalized === "0000...0000" ||
    normalized.includes("unknown")
  ) {
    failures.push(`${label} must come from the production Entra app, got ${JSON.stringify(value)}`);
  }
}

function assertTenantSpecificMicrosoftUrl(label, value) {
  assertPresent(label, value);
  if (typeof value !== "string") return;
  const normalized = value.trim().toLowerCase();
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    failures.push(`${label} must be a valid URL, got ${JSON.stringify(value)}`);
    return;
  }
  const pathname = parsed.pathname.toLowerCase();
  const genericTenants = ["/common/", "/organizations/", "/consumers/"];
  if (
    normalized.includes("{tenantid}") ||
    pathname.includes("%7btenantid%7d") ||
    genericTenants.some((tenant) => pathname.includes(tenant))
  ) {
    failures.push(`${label} must use a tenant-specific Entra endpoint, got ${JSON.stringify(value)}`);
  }
}

function assertIsoDate(label, value) {
  assertPresent(label, value);
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    failures.push(`${label} must be an ISO timestamp, got ${JSON.stringify(value)}`);
    return null;
  }
  return timestamp;
}

function assertProtocol(label, value) {
  if (typeof value !== "string" || !value.toUpperCase().startsWith(expectedProtocol)) {
    failures.push(`${label} must start with ${expectedProtocol}, got ${JSON.stringify(value)}`);
  }
}

function assertTrue(label, value) {
  if (value !== true) failures.push(`${label} must be true`);
}

function viewerUrlForCode(baseUrl, code) {
  if (typeof code !== "string" || code.trim() === "") return null;
  try {
    return new URL(`/p/${encodeURIComponent(code.trim())}`, baseUrl).toString();
  } catch {
    failures.push(`Manual evidence base URL must be a valid URL, got ${JSON.stringify(baseUrl)}`);
    return null;
  }
}

function healthUrlForBaseUrl(baseUrl) {
  try {
    return new URL("/api/health", `${baseUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    failures.push(`--base-url must be a valid URL, got ${JSON.stringify(baseUrl)}`);
    return null;
  }
}

function liveKitApiUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "wss:") parsed.protocol = "https:";
    else if (parsed.protocol === "ws:") parsed.protocol = "http:";
    else {
      failures.push(`--livekit-url must use ws:// or wss://, got ${JSON.stringify(url)}`);
      return null;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    failures.push(`--livekit-url must be a valid URL, got ${JSON.stringify(url)}`);
    return null;
  }
}

function liveKitHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    failures.push(`--livekit-url must be a valid URL, got ${JSON.stringify(url)}`);
    return null;
  }
}

function isLocalBaseUrl() {
  try {
    const url = new URL(values["base-url"]);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

function visitReport(value, path, visitor) {
  visitor(path, value);
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitReport(item, [...path, String(index)], visitor));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    visitReport(item, [...path, key], visitor);
  }
}

function normalizeProtocol(value) {
  if (!value) return null;
  const protocol = value.trim().toUpperCase();
  if (protocol === "UDP" || protocol === "TCP") return protocol;
  failures.push(`--protocol must be udp or tcp, got ${JSON.stringify(value)}`);
  return null;
}

function normalizeTcpFallbackPort(value) {
  const port = Number(value);
  if (Number.isInteger(port) && port >= 1 && port <= 65535) return port;
  failures.push(
    `--tcp-fallback-port must be a TCP port number, got ${JSON.stringify(
      value,
    )}`,
  );
  return null;
}
