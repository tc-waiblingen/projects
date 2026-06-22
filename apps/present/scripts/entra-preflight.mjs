import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import * as client from "openid-client";

const startedAtMs = Date.now();
const startedAt = new Date();
const tenantId = requireEnv("ENTRA_TENANT_ID");
const clientId = requireEnv("ENTRA_CLIENT_ID");
const clientSecret = requireEnv("ENTRA_CLIENT_SECRET");
const publicUrl = normalizePublicUrl(
  process.env.PRESENT_PUBLIC_URL || "http://localhost:3003",
);
const adminRole = process.env.ENTRA_ADMIN_ROLE || "Present.Admin";
const moderatorRole = process.env.ENTRA_MODERATOR_ROLE || "Present.Moderator";
const redirectUri = `${publicUrl}/api/auth/entra/callback`;
const issuer = new URL(`https://login.microsoftonline.com/${tenantId}/v2.0`);
const outputDir =
  process.env.ENTRA_PREFLIGHT_OUTPUT_DIR ||
  process.env.PRESENT_SMOKE_OUTPUT_DIR ||
  ".tmp";
const reportName = `entra-preflight-${safeReportPart(mask(tenantId))}-${safeReportPart(mask(clientId))}.json`;

let summary = {
  tenantId: mask(tenantId),
  clientId: mask(clientId),
  publicUrl,
  redirectUri,
  issuer: issuer.toString(),
  adminRole,
  moderatorRole,
  startedAt: startedAt.toISOString(),
  completedAt: null,
  result: "running",
  checks: {},
  limitations: [
    "Discovery and authorization URL construction do not prove the client secret.",
    "App role assignment is only proven by a real moderator login and callback.",
    "The redirect URI must still be registered exactly in the Entra app registration.",
  ],
  elapsedMs: 0,
  preflightReport: null,
  error: null,
};

try {
  const config = await client.discovery(
    issuer,
    clientId,
    clientSecret,
    undefined,
    {
      timeout: Number(process.env.ENTRA_PREFLIGHT_TIMEOUT_MS || 15_000),
    },
  );
  const metadata = config.serverMetadata();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();
  const authorizationUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: "openid profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  const checks = {
    issuerDiscovered: Boolean(metadata.issuer),
    authorizationEndpointDiscovered: Boolean(metadata.authorization_endpoint),
    tokenEndpointDiscovered: Boolean(metadata.token_endpoint),
    jwksUriDiscovered: Boolean(metadata.jwks_uri),
    authorizationUrlUsesDiscoveredEndpoint:
      authorizationUrl.origin ===
        new URL(metadata.authorization_endpoint).origin &&
      authorizationUrl.pathname ===
        new URL(metadata.authorization_endpoint).pathname,
    authorizationUrlContainsClientId:
      authorizationUrl.searchParams.get("client_id") === clientId,
    authorizationUrlContainsRedirectUri:
      authorizationUrl.searchParams.get("redirect_uri") === redirectUri,
    authorizationUrlUsesCodeFlow:
      authorizationUrl.searchParams.get("response_type") === "code",
    authorizationUrlUsesPkce:
      authorizationUrl.searchParams.get("code_challenge_method") === "S256" &&
      Boolean(authorizationUrl.searchParams.get("code_challenge")),
    authorizationUrlUsesStateAndNonce:
      authorizationUrl.searchParams.get("state") === state &&
      authorizationUrl.searchParams.get("nonce") === nonce,
    authorizationUrlUsesOpenIdProfileScope:
      authorizationUrl.searchParams.get("scope") === "openid profile",
  };

  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  summary = {
    ...summary,
    issuer: metadata.issuer,
    authorizationEndpoint: metadata.authorization_endpoint,
    tokenEndpoint: metadata.token_endpoint,
    jwksUri: metadata.jwks_uri,
    checks,
  };

  if (failed.length > 0) {
    throw new Error(`Entra preflight failed checks: ${failed.join(", ")}`);
  }
  completePreflight();
} catch (error) {
  recordPreflightFailure(error);
  throw error;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

function normalizePublicUrl(value) {
  return value.replace(/\/+$/, "");
}

function mask(value) {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
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
    console.error(`Could not write Entra preflight report: ${formatError(reportError)}`);
  }
}

function writePreflightReport() {
  mkdirSync(outputDir, { recursive: true });
  const path = join(outputDir, reportName);
  summary.preflightReport = { path };
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`);
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
