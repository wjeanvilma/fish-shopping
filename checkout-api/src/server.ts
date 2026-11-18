/**
 * Finish 2.0 Phase 25 — local web checkout API emulator.
 * Finish 3.0 Phase 16 — live Stripe Checkout + webhook when CHECKOUT_API_MODE=live.
 *
 * Endpoints match shared/billing/web-billing.json:
 *   POST /v1/checkout
 *   GET  /v1/entitlements?cloudAccountId=
 *   POST /v1/fulfill
 *   POST /v1/stripe/webhook  (Phase 16)
 *
 * No payment-provider secrets committed. Instant stub mode by default.
 *
 * Run from repo:  cd web && npm run checkout-api:dev
 * Or:             npx --prefix web vite-node ../checkout-api/src/server.ts
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { BILLING_API, DEFAULT_PORT } from "./catalog";
import {
  handleCheckout,
  handleEntitlements,
  handleFulfill,
  instantCheckoutEnabled,
  ROUTE_PATHS,
  type CheckoutBody,
  type FulfillBody,
} from "./handlers";
import {
  applyStripeCheckoutCompleted,
  isLiveMode,
  stripeConfigured,
  stripeWebhookSecret,
  STRIPE_WEBHOOK_PATH,
  verifyStripeWebhook,
} from "./stripeLive";
import { sharedStore } from "./store";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
  });
  res.end(payload);
}

function parseQuery(url: string): URLSearchParams {
  const q = url.includes("?") ? url.slice(url.indexOf("?")) : "";
  return new URLSearchParams(q.startsWith("?") ? q.slice(1) : q);
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const rawUrl = req.url ?? "/";
  const path = rawUrl.split("?")[0] ?? "/";

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
    });
    res.end();
    return;
  }

  if (method === "GET" && path === "/health") {
    sendJson(res, 200, {
      ok: true,
      phase: 25,
      finish3StripeLivePhase: 16,
      mode: process.env.CHECKOUT_API_MODE ?? "stub",
      instant: instantCheckoutEnabled(),
      live: isLiveMode(),
      stripeConfigured: stripeConfigured(),
      webhookPath: STRIPE_WEBHOOK_PATH,
    });
    return;
  }

  // Sandbox pay page — redirects to successUrl after marking session ready for fulfill.
  // Live mode never uses this path for checkout.url responses.
  if (method === "GET" && path === "/sandbox/pay") {
    const params = parseQuery(rawUrl);
    const sessionId = params.get("session_id") ?? "";
    const session = sharedStore.getSession(sessionId);
    const dest = session?.successUrl ?? "/?billing=success";
    res.writeHead(302, { Location: dest, "Access-Control-Allow-Origin": "*" });
    res.end();
    return;
  }

  if (method === "POST" && path === ROUTE_PATHS.stripeWebhook) {
    const raw = await readBody(req);
    const sig = req.headers["stripe-signature"];
    const header = Array.isArray(sig) ? sig[0] : sig;
    const verified = verifyStripeWebhook(raw, header, stripeWebhookSecret());
    if ("error" in verified) {
      sendJson(res, verified.status, { error: verified.error });
      return;
    }
    const applied = applyStripeCheckoutCompleted(verified, sharedStore);
    if ("error" in applied) {
      sendJson(res, applied.status, { error: applied.error });
      return;
    }
    sendJson(res, 200, { received: true, webProductId: applied.webProductId || null });
    return;
  }

  if (method === BILLING_API.checkout.method && path === BILLING_API.checkout.path) {
    const raw = await readBody(req);
    let body: CheckoutBody = {};
    try {
      body = raw ? (JSON.parse(raw) as CheckoutBody) : {};
    } catch {
      sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }
    const result = await handleCheckout(body);
    if ("error" in result) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (method === BILLING_API.entitlements.method && path === BILLING_API.entitlements.path) {
    const params = parseQuery(rawUrl);
    const cloudAccountId = params.get("cloudAccountId");
    sendJson(res, 200, handleEntitlements(cloudAccountId));
    return;
  }

  if (method === BILLING_API.fulfill.method && path === BILLING_API.fulfill.path) {
    const raw = await readBody(req);
    let body: FulfillBody = {};
    try {
      body = raw ? (JSON.parse(raw) as FulfillBody) : {};
    } catch {
      sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }
    const result = handleFulfill(body);
    if ("error" in result) {
      sendJson(res, result.status, { error: result.error });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const server = createServer((req, res) => {
  void route(req, res).catch((err) => {
    console.error(err);
    sendJson(res, 500, { error: "Internal error" });
  });
});

server.listen(port, () => {
  console.log(`[checkout-api] listening on http://localhost:${port}`);
  console.log(
    `[checkout-api] mode=${process.env.CHECKOUT_API_MODE ?? "stub"} instant=${instantCheckoutEnabled()} live=${isLiveMode()} stripeConfigured=${stripeConfigured()}`,
  );
  console.log(`[checkout-api] POST ${BILLING_API.checkout.path}`);
  console.log(`[checkout-api] GET  ${BILLING_API.entitlements.path}`);
  console.log(`[checkout-api] POST ${BILLING_API.fulfill.path}`);
  console.log(`[checkout-api] POST ${STRIPE_WEBHOOK_PATH}`);
});
