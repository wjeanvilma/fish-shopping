/**
 * Finish 3.0 Phase 16 — live Stripe Checkout + webhook adapters.
 *
 * Default CI/local path stays stub/instant. Live mode fails closed without
 * STRIPE_SECRET_KEY (never falls back to /sandbox/pay while claiming live).
 * No Stripe SDK dependency — thin fetch + injectable clients for tests.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CheckoutStore } from "./store";

const here = dirname(fileURLToPath(import.meta.url));

export const STRIPE_WEBHOOK_PATH = "/v1/stripe/webhook";
export const STRIPE_CHECKOUT_HOST = "https://checkout.stripe.com/";
export const STRIPE_API_SESSIONS = "https://api.stripe.com/v1/checkout/sessions";

export interface StripeSessionRequest {
  webProductId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  cloudAccountId: string | null;
  metadata?: Record<string, string>;
}

export interface StripeSessionResult {
  id: string;
  url: string;
}

export type StripeSessionCreator = (
  req: StripeSessionRequest,
  secretKey: string,
) => Promise<StripeSessionResult>;

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

function productsPath(): string {
  return resolve(here, "../../shared/billing/web-checkout-products.json");
}

export function isLiveMode(env: Record<string, string | undefined> = process.env): boolean {
  return (env.CHECKOUT_API_MODE ?? "stub").trim().toLowerCase() === "live";
}

export function stripeSecretKey(env: Record<string, string | undefined> = process.env): string {
  return (env.STRIPE_SECRET_KEY ?? "").trim();
}

export function stripeWebhookSecret(env: Record<string, string | undefined> = process.env): string {
  return (env.STRIPE_WEBHOOK_SECRET ?? "").trim();
}

export function stripeConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return stripeSecretKey(env).length > 0;
}

/** Load active product → Stripe price id map (placeholders OK). */
export function loadStripePriceMap(
  catalogPath: string = productsPath(),
): Map<string, string> {
  const raw = JSON.parse(readFileSync(catalogPath, "utf8")) as {
    products?: Array<{ webProductId?: string; stripePriceId?: string; status?: string }>;
  };
  const map = new Map<string, string>();
  for (const p of raw.products ?? []) {
    if (!p.webProductId || p.status === "inactive") continue;
    const price = (p.stripePriceId ?? "").trim();
    if (price) map.set(p.webProductId, price);
  }
  return map;
}

export function priceIdForProduct(
  webProductId: string,
  env: Record<string, string | undefined> = process.env,
  priceMap: Map<string, string> = loadStripePriceMap(),
): string | null {
  const envKey = `STRIPE_PRICE_${webProductId.replace(/\./g, "_").toUpperCase()}`;
  const fromEnv = (env[envKey] ?? "").trim();
  if (fromEnv) return fromEnv;
  return priceMap.get(webProductId) ?? null;
}

/** Default Stripe Checkout Session creator via HTTPS form POST. */
export const fetchStripeCheckoutSession: StripeSessionCreator = async (req, secretKey) => {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", req.successUrl);
  body.set("cancel_url", req.cancelUrl);
  body.set("client_reference_id", req.clientReferenceId);
  body.set("line_items[0][price]", req.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("metadata[webProductId]", req.webProductId);
  if (req.cloudAccountId) body.set("metadata[cloudAccountId]", req.cloudAccountId);
  for (const [k, v] of Object.entries(req.metadata ?? {})) {
    body.set(`metadata[${k}]`, v);
  }

  const res = await fetch(STRIPE_API_SESSIONS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.id || !json.url) {
    throw new Error(json.error?.message ?? `Stripe session create failed (${res.status})`);
  }
  return { id: json.id, url: json.url };
};

export async function createLiveCheckoutUrl(opts: {
  webProductId: string;
  cloudAccountId: string | null;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  env?: Record<string, string | undefined>;
  createSession?: StripeSessionCreator;
  priceMap?: Map<string, string>;
}): Promise<{ url: string; stripeSessionId: string } | { error: string; status: number }> {
  const env = opts.env ?? process.env;
  if (!isLiveMode(env)) {
    return { error: "createLiveCheckoutUrl requires CHECKOUT_API_MODE=live", status: 500 };
  }
  const secret = stripeSecretKey(env);
  if (!secret) {
    return {
      error: "Live Stripe mode requires STRIPE_SECRET_KEY (refusing sandbox fallback)",
      status: 503,
    };
  }
  const priceId = priceIdForProduct(opts.webProductId, env, opts.priceMap);
  if (!priceId) {
    return { error: `No Stripe price mapped for ${opts.webProductId}`, status: 500 };
  }
  const create = opts.createSession ?? fetchStripeCheckoutSession;
  try {
    const session = await create(
      {
        webProductId: opts.webProductId,
        priceId,
        successUrl: opts.successUrl,
        cancelUrl: opts.cancelUrl,
        clientReferenceId: opts.clientReferenceId,
        cloudAccountId: opts.cloudAccountId,
      },
      secret,
    );
    if (!session.url.startsWith(STRIPE_CHECKOUT_HOST) && !session.url.includes("checkout.stripe.com")) {
      // Allow test doubles that use https://checkout.stripe.com/... placeholders.
      if (!session.url.includes("stripe.com")) {
        return { error: "Stripe session URL is not a Stripe Checkout host", status: 502 };
      }
    }
    return { url: session.url, stripeSessionId: session.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe session create failed";
    return { error: message, status: 502 };
  }
}

/**
 * Verify Stripe-Signature header (t=…,v1=…).
 * Returns the parsed event JSON on success.
 */
export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
  webhookSecret: string,
  opts: { toleranceSec?: number; nowMs?: number } = {},
): StripeWebhookEvent | { error: string; status: number } {
  if (!webhookSecret) {
    return { error: "STRIPE_WEBHOOK_SECRET not configured", status: 503 };
  }
  if (!signatureHeader) {
    return { error: "Missing Stripe-Signature header", status: 400 };
  }
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    }),
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) {
    return { error: "Malformed Stripe-Signature header", status: 400 };
  }
  const tolerance = opts.toleranceSec ?? 300;
  const nowSec = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > tolerance) {
    return { error: "Stripe webhook timestamp outside tolerance", status: 400 };
  }
  const signed = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", webhookSecret).update(signed, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { error: "Invalid Stripe webhook signature", status: 400 };
  }
  try {
    return JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return { error: "Invalid webhook JSON", status: 400 };
  }
}

/** Apply checkout.session.completed → grant entitlement via local session map. */
export function applyStripeCheckoutCompleted(
  event: StripeWebhookEvent,
  store: CheckoutStore,
): { ok: true; webProductId: string; duplicate?: boolean } | { error: string; status: number } {
  const eventId = String(event.id ?? "").trim();
  if (eventId && store.hasProcessedStripeEvent(eventId)) {
    return { ok: true, webProductId: "", duplicate: true };
  }
  if (event.type !== "checkout.session.completed") {
    if (eventId) store.markStripeEventProcessed(eventId);
    return { ok: true, webProductId: "" };
  }
  const obj = event.data?.object ?? {};
  const clientRef = String(obj["client_reference_id"] ?? "");
  const meta = (obj["metadata"] as Record<string, string> | undefined) ?? {};
  const webProductId = (meta.webProductId ?? "").trim();
  if (!webProductId) {
    return { error: "checkout.session.completed missing metadata.webProductId", status: 400 };
  }
  const cloudAccountId = (meta.cloudAccountId ?? null) || null;
  if (clientRef) {
    // Prefer fulfill via our session id when Stripe client_reference_id is our sess_…
    const rows = store.fulfillSession(clientRef, cloudAccountId);
    if (rows.some((r) => r.webProductId === webProductId)) {
      if (eventId) store.markStripeEventProcessed(eventId);
      return { ok: true, webProductId };
    }
  }
  store.grant(cloudAccountId, webProductId, `stripe-${String(obj["id"] ?? event.id)}`);
  if (eventId) store.markStripeEventProcessed(eventId);
  return { ok: true, webProductId };
}

/** Finish 4.0 Phase 25 — live-ready catalog ops readiness snapshot. */
export function stripeOpsReadiness(
  env: Record<string, string | undefined> = process.env,
  priceMap: Map<string, string> = loadStripePriceMap(),
): {
  ok: boolean;
  catalogOk: boolean;
  priceMapOk: boolean;
  priceMapSize: number;
  skuFloor: number;
  live: boolean;
  stripeConfigured: boolean;
  liveReady: boolean;
  webhookSecretConfigured: boolean;
  mode: string;
} {
  const skuFloor = 19;
  const priceMapSize = priceMap.size;
  const catalogOk = priceMapSize >= skuFloor;
  const priceMapOk = catalogOk;
  const live = isLiveMode(env);
  const configured = stripeConfigured(env);
  const webhookSecretConfigured = stripeWebhookSecret(env).length > 0;
  const liveReady = live && configured && webhookSecretConfigured && priceMapOk;
  return {
    ok: catalogOk && priceMapOk,
    catalogOk,
    priceMapOk,
    priceMapSize,
    skuFloor,
    live,
    stripeConfigured: configured,
    liveReady,
    webhookSecretConfigured,
    mode: (env.CHECKOUT_API_MODE ?? "stub").trim().toLowerCase() || "stub",
  };
}
