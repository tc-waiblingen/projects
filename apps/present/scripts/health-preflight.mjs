import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const startedAtMs = Date.now();
const startedAt = new Date();
const baseUrl = normalizeBaseUrl(
  process.env.PRESENT_HEALTH_BASE_URL ||
    process.env.PRESENT_PUBLIC_URL ||
    "https://present.tc-waiblingen.de",
);
const healthUrl = new URL("/api/health", `${baseUrl}/`).toString();
const timeoutMs = Number(process.env.PRESENT_HEALTH_TIMEOUT_MS || 15_000);
const outputDir =
  process.env.PRESENT_HEALTH_OUTPUT_DIR ||
  process.env.PRESENT_SMOKE_OUTPUT_DIR ||
  ".tmp";

validateTimeout(timeoutMs);

const summary = {
  baseUrl,
  healthUrl,
  status: null,
  ok: false,
  startedAt: startedAt.toISOString(),
  completedAt: null,
  result: "running",
  checks: {
    statusOk: false,
    bodyOk: false,
    databaseOk: false,
    liveKitConfigured: false,
    authReady: false,
  },
  body: null,
  elapsedMs: 0,
  healthReport: null,
  error: null,
};

try {
  const response = await fetchWithTimeout(healthUrl);
  summary.status = response.status;
  summary.body = sanitizeHealthBody(await readJson(response));
  summary.ok = summary.body.ok === true;
  summary.checks = {
    statusOk: response.status === 200,
    bodyOk: summary.body.ok === true,
    databaseOk: summary.body.database.ok === true,
    liveKitConfigured: summary.body.livekit.configured === true,
    authReady: summary.body.auth.ready === true,
  };

  const failed = Object.entries(summary.checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(`Health preflight failed checks: ${failed.join(", ")}`);
  }

  completePreflight();
} catch (error) {
  recordPreflightFailure(error);
  throw error;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error("Health endpoint did not return valid JSON");
  }
}

function sanitizeHealthBody(value) {
  const source = objectValue(value);
  const database = objectValue(source.database);
  const livekit = objectValue(source.livekit);
  const auth = objectValue(source.auth);

  return {
    ok: booleanOrNull(source.ok),
    database: {
      ok: booleanOrNull(database.ok),
    },
    livekit: {
      configured: booleanOrNull(livekit.configured),
      required: booleanOrNull(livekit.required),
      urlConfigured: booleanOrNull(livekit.urlConfigured),
      apiKeyConfigured: booleanOrNull(livekit.apiKeyConfigured),
      apiSecretConfigured: booleanOrNull(livekit.apiSecretConfigured),
      apiUrlValid: booleanOrNull(livekit.apiUrlValid),
      urlUsesWss: booleanOrNull(livekit.urlUsesWss),
    },
    auth: {
      ready: booleanOrNull(auth.ready),
      required: booleanOrNull(auth.required),
      publicUrlConfigured: booleanOrNull(auth.publicUrlConfigured),
      publicUrlValid: booleanOrNull(auth.publicUrlValid),
      publicUrlUsesHttps: booleanOrNull(auth.publicUrlUsesHttps),
      sessionSecretConfigured: booleanOrNull(auth.sessionSecretConfigured),
      sessionSecretStrong: booleanOrNull(auth.sessionSecretStrong),
      entraTenantConfigured: booleanOrNull(auth.entraTenantConfigured),
      entraTenantSpecific: booleanOrNull(auth.entraTenantSpecific),
      entraClientConfigured: booleanOrNull(auth.entraClientConfigured),
      entraClientSecretConfigured: booleanOrNull(
        auth.entraClientSecretConfigured,
      ),
    },
  };
}

function objectValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function booleanOrNull(value) {
  return typeof value === "boolean" ? value : null;
}

function completePreflight() {
  summary.completedAt = new Date().toISOString();
  summary.elapsedMs = Date.now() - startedAtMs;
  summary.result = "passed";
  writePreflightReport();
  console.log(JSON.stringify(summary, null, 2));
}

function recordPreflightFailure(error) {
  summary.completedAt = new Date().toISOString();
  summary.elapsedMs = Date.now() - startedAtMs;
  summary.result = "failed";
  summary.error = formatError(error);
  try {
    writePreflightReport();
  } catch (reportError) {
    console.error(`Could not write health preflight report: ${formatError(reportError)}`);
  }
}

function writePreflightReport() {
  mkdirSync(outputDir, { recursive: true });
  const path = join(
    outputDir,
    `health-preflight-${safeReportPart(new URL(baseUrl).hostname)}-${Date.now().toString(36)}.json`,
  );
  summary.healthReport = { path };
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`);
}

function normalizeBaseUrl(value) {
  const normalized = value.replace(/\/+$/, "");
  // Validate early so an invalid URL still writes a readable failure report below.
  new URL(normalized);
  return normalized;
}

function validateTimeout(value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("PRESENT_HEALTH_TIMEOUT_MS must be a positive integer");
  }
}

function safeReportPart(value) {
  const safe = value
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 48);
  return safe || "unknown";
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
