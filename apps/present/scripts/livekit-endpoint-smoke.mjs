import { randomUUID } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { createConnection } from "net";
import { join } from "path";
import { clientProtocol, protocolVersion, version } from "livekit-client";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const startedAtMs = Date.now();
const startedAt = new Date();
const liveKitUrl = requireEnv("LIVEKIT_URL");
const apiKey = requireEnv("LIVEKIT_API_KEY");
const apiSecret = requireEnv("LIVEKIT_API_SECRET");
const apiUrl = liveKitApiUrl(liveKitUrl);
const tcpFallbackPort = Number(process.env.LIVEKIT_TCP_FALLBACK_PORT || 7881);
const roomName = `tcw-present-preflight-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const timeoutMs = Number(process.env.LIVEKIT_PREFLIGHT_TIMEOUT_MS || 15_000);
const outputDir =
  process.env.LIVEKIT_PREFLIGHT_OUTPUT_DIR ||
  process.env.PRESENT_SMOKE_OUTPUT_DIR ||
  ".tmp";
const client = new RoomServiceClient(apiUrl, apiKey, apiSecret, {
  requestTimeout: timeoutMs,
});

const summary = {
  liveKitUrl,
  apiUrl,
  apiKey: mask(apiKey),
  roomName,
  startedAt: startedAt.toISOString(),
  completedAt: null,
  result: "running",
  created: false,
  listed: false,
  signalingConnected: false,
  tcpFallbackHost: liveKitHost(liveKitUrl),
  tcpFallbackPort,
  tcpFallbackReachable: false,
  deleted: false,
  elapsedMs: 0,
  preflightReport: null,
  error: null,
};

validateTcpFallbackPort(tcpFallbackPort);

let preflightError = null;
let deleteError = null;

try {
  await verifyTcpFallbackReachable();
  summary.tcpFallbackReachable = true;

  await client.createRoom({
    name: roomName,
    emptyTimeout: 60,
    maxParticipants: 2,
  });
  summary.created = true;

  const rooms = await client.listRooms([roomName]);
  summary.listed = rooms.some((room) => room.name === roomName);
  if (!summary.listed)
    throw new Error(`Created room was not returned by listRooms(${roomName})`);

  await verifySignalingConnection();
  summary.signalingConnected = true;
} catch (error) {
  preflightError = error;
} finally {
  if (summary.created) {
    await client.deleteRoom(roomName).then(
      () => {
        summary.deleted = true;
      },
      (error) => {
        deleteError = error;
        console.error(
          `Could not delete preflight room ${roomName}: ${formatError(error)}`,
        );
      },
    );
  }
}

if (!preflightError && summary.created && !summary.deleted) {
  preflightError =
    deleteError ?? new Error(`Could not delete preflight room ${roomName}`);
}
if (preflightError) {
  recordPreflightFailure(preflightError);
  throw preflightError;
}
completePreflight();

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
    console.error(`Could not write LiveKit preflight report: ${formatError(reportError)}`);
  }
}

function writePreflightReport() {
  mkdirSync(outputDir, { recursive: true });
  const path = join(outputDir, `livekit-endpoint-preflight-${roomName}.json`);
  summary.preflightReport = { path };
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

function liveKitApiUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol === "wss:") parsed.protocol = "https:";
  else if (parsed.protocol === "ws:") parsed.protocol = "http:";
  else throw new Error("LIVEKIT_URL must use ws:// or wss://");
  return parsed.toString().replace(/\/$/, "");
}

function liveKitHost(url) {
  return new URL(url).hostname;
}

function validateTcpFallbackPort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("LIVEKIT_TCP_FALLBACK_PORT must be a TCP port number");
  }
}

function verifyTcpFallbackReachable() {
  return new Promise((resolve, reject) => {
    const socket = createConnection({
      host: summary.tcpFallbackHost,
      port: tcpFallbackPort,
      timeout: timeoutMs,
    });
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(
        new Error(
          `Timed out connecting to LiveKit TCP fallback ${summary.tcpFallbackHost}:${tcpFallbackPort} after ${timeoutMs}ms`,
        ),
      );
    });
    socket.once("error", (error) => {
      reject(
        new Error(
          `LiveKit TCP fallback ${summary.tcpFallbackHost}:${tcpFallbackPort} is not reachable: ${formatError(
            error,
          )}`,
        ),
      );
    });
  });
}

async function verifySignalingConnection() {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: `preflight:${randomUUID()}`,
    ttl: "2m",
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: false,
    canSubscribe: false,
  });

  const wsUrl = signalingUrl(liveKitUrl, await token.toJwt());
  const socket = new WebSocket(wsUrl);
  const opened = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out connecting to LiveKit signaling after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        reject(new Error("LiveKit signaling WebSocket failed to open"));
      },
      { once: true },
    );
    socket.addEventListener(
      "close",
      (event) => {
        clearTimeout(timer);
        reject(
          new Error(
            `LiveKit signaling WebSocket closed before opening (${event.code} ${event.reason})`,
          ),
        );
      },
      { once: true },
    );
  });

  try {
    await opened;
  } finally {
    socket.close(1000, "preflight complete");
  }
}

function signalingUrl(url, token) {
  const parsed = new URL(url);
  parsed.protocol = parsed.protocol.replace(/^http/, "ws");
  parsed.pathname = `${parsed.pathname.replace(/\/$/, "")}/rtc`;
  parsed.searchParams.set("access_token", token);
  parsed.searchParams.set("auto_subscribe", "0");
  parsed.searchParams.set("sdk", "js");
  parsed.searchParams.set("version", version);
  parsed.searchParams.set("protocol", protocolVersion.toString());
  parsed.searchParams.set("client_protocol", clientProtocol.toString());
  return parsed.toString();
}

function mask(value) {
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}...${value.slice(-2)}`;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
