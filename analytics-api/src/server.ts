/**
 * Finish 3.0 Phase 26 — local analytics batch API emulator.
 *
 *   GET  /health
 *   POST /v1/analytics/batch
 *
 * No secrets. Run: cd web && npm run analytics-api:dev
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  DEFAULT_PORT,
  ENDPOINT_PATH,
  HEALTH_PATH,
  LOCAL_DEFAULT_BASE,
} from "./catalog";
import { handleBatch, handleHealth, type BatchBody } from "./handlers";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = status === 204 ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Accept",
  });
  res.end(payload);
}

async function onRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  if (method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (method === "GET" && path === HEALTH_PATH) {
    sendJson(res, 200, handleHealth());
    return;
  }

  if (method === "POST" && path === ENDPOINT_PATH) {
    let body: BatchBody = {};
    try {
      const raw = await readBody(req);
      body = raw ? (JSON.parse(raw) as BatchBody) : {};
    } catch {
      sendJson(res, 400, { error: "invalid JSON", status: 400 });
      return;
    }
    const result = handleBatch(body);
    if ("error" in result) {
      sendJson(res, result.status, result);
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  sendJson(res, 404, { error: "not found", status: 404 });
}

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const server = createServer((req, res) => {
  void onRequest(req, res).catch((err) => {
    console.error("[analytics-api]", err);
    sendJson(res, 500, { error: "internal", status: 500 });
  });
});

server.listen(port, () => {
  console.log(`[analytics-api] listening on http://localhost:${port}`);
  console.log(`[analytics-api] GET  ${HEALTH_PATH}`);
  console.log(`[analytics-api] POST ${ENDPOINT_PATH}`);
  console.log(`[analytics-api] default base ${LOCAL_DEFAULT_BASE}`);
});
