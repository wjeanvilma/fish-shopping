/**
 * Finish 2.0 Phase 25 — checkout / entitlements / fulfill handlers
 * conforming to shared/billing/web-billing.json.
 */
import { BILLING_API, DEFAULT_PORT, isKnownProduct } from "./catalog";
import { sharedStore, type CheckoutStore, type OwnedEntitlement } from "./store";

export type CheckoutResult =
  | { status: "completed"; webProductId: string; purchaseToken: string }
  | { status: "owned"; webProductId: string; purchaseToken: string }
  | { status: "checkout"; url: string };

export interface HandlerError {
  error: string;
  status: number;
}

export interface CheckoutBody {
  webProductId?: string;
  cloudAccountId?: string | null;
  successUrl?: string;
  cancelUrl?: string;
}

export interface FulfillBody {
  sessionId?: string;
  cloudAccountId?: string | null;
}

/** When true (default for local emulator), checkout returns completed immediately. */
export function instantCheckoutEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const mode = (env.CHECKOUT_API_MODE ?? "stub").trim().toLowerCase();
  if (mode === "live") return false;
  const instant = (env.CHECKOUT_API_INSTANT ?? "1").trim();
  return instant !== "0" && instant.toLowerCase() !== "false";
}

function publicBase(env: Record<string, string | undefined> = process.env): string {
  const fromEnv = env.CHECKOUT_API_PUBLIC_BASE?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const port = Number(env.PORT ?? DEFAULT_PORT);
  return `http://localhost:${Number.isFinite(port) ? port : DEFAULT_PORT}`;
}

function toClientRow(row: OwnedEntitlement): { webProductId: string; purchaseToken: string } {
  return { webProductId: row.webProductId, purchaseToken: row.purchaseToken };
}

export function handleCheckout(
  body: CheckoutBody,
  opts: {
    store?: CheckoutStore;
    instant?: boolean;
    publicBase?: string;
    env?: Record<string, string | undefined>;
  } = {},
): CheckoutResult | HandlerError {
  const store = opts.store ?? sharedStore;
  const env = opts.env ?? process.env;
  const webProductId = body.webProductId?.trim() ?? "";
  if (!webProductId) return { error: "webProductId required", status: 400 };
  if (!isKnownProduct(webProductId)) return { error: `Unknown web product: ${webProductId}`, status: 400 };

  const cloudAccountId = body.cloudAccountId ?? null;
  const owned = store.getOwned(cloudAccountId, webProductId);
  if (owned) {
    return { status: "owned", webProductId: owned.webProductId, purchaseToken: owned.purchaseToken };
  }

  const instant = opts.instant ?? instantCheckoutEnabled(env);
  if (instant) {
    const row = store.grant(cloudAccountId, webProductId);
    return { status: "completed", webProductId: row.webProductId, purchaseToken: row.purchaseToken };
  }

  const successUrl = body.successUrl?.trim() || `${publicBase(env)}/?billing=success`;
  const cancelUrl = body.cancelUrl?.trim() || `${publicBase(env)}/?billing=cancel`;
  const session = store.createSession(webProductId, cloudAccountId, successUrl, cancelUrl);
  const base = opts.publicBase ?? publicBase(env);
  const url = `${base}/sandbox/pay?session_id=${encodeURIComponent(session.sessionId)}&billing=success`;
  return { status: "checkout", url };
}

export function handleEntitlements(
  cloudAccountId: string | null,
  store: CheckoutStore = sharedStore,
): { entitlements: Array<{ webProductId: string; purchaseToken: string }> } {
  return { entitlements: store.list(cloudAccountId).map(toClientRow) };
}

export function handleFulfill(
  body: FulfillBody,
  store: CheckoutStore = sharedStore,
): { entitlements: Array<{ webProductId: string; purchaseToken: string }> } | HandlerError {
  const sessionId = body.sessionId?.trim() ?? "";
  if (!sessionId) return { error: "sessionId required", status: 400 };
  const cloudAccountId = body.cloudAccountId ?? null;
  const rows = store.fulfillSession(sessionId, cloudAccountId);
  return { entitlements: rows.map(toClientRow) };
}

export const ROUTE_PATHS = {
  checkout: BILLING_API.checkout.path,
  entitlements: BILLING_API.entitlements.path,
  fulfill: BILLING_API.fulfill.path,
} as const;
