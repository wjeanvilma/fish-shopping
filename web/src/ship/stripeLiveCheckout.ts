/**
 * Finish 3.0 Phase 16 — live Stripe web checkout
 * (mirrors shared/ship/stripe-live-checkout.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/stripe-live-checkout.json";
import { SCHEMA_VERSION } from "../engine";

export interface StripeLiveCheckoutCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  stripeLiveCheckoutMarker: string;
  webhookPath: string;
  checkoutHost: string;
  closesGap: string;
  priorCheckoutApiPhase: number;
  authorModules: string[];
  envPlaceholders: string[];
  kickoffCatalog: string;
  billingContract: string;
  productsCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const STRIPE_LIVE_CHECKOUT = catalogJson as unknown as StripeLiveCheckoutCatalog;
export const STRIPE_LIVE_CHECKOUT_PHASE = STRIPE_LIVE_CHECKOUT.phase;
export const STRIPE_LIVE_CHECKOUT_SCHEMA = STRIPE_LIVE_CHECKOUT.schema;
export const STRIPE_LIVE_CHECKOUT_MARKER = STRIPE_LIVE_CHECKOUT.stripeLiveCheckoutMarker;
export const STRIPE_LIVE_WEBHOOK_PATH = STRIPE_LIVE_CHECKOUT.webhookPath;

export interface StripeLiveMeasure {
  schemaVersion: number;
  priceMapComplete: boolean;
  missingPriceProducts: string[];
  liveSymbolsTs: boolean;
  webhookRouteWired: boolean;
  kickoffWired: boolean;
  gapClosed: boolean;
  measuredAtPhase: number;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureStripeLiveCheckout(repoRoot: string): StripeLiveMeasure {
  const products = readJson(resolve(repoRoot, STRIPE_LIVE_CHECKOUT.productsCatalog));
  const missingPriceProducts: string[] = [];
  for (const p of products.products ?? []) {
    if (p.status === "inactive") continue;
    if (!(p.stripePriceId ?? "").trim()) missingPriceProducts.push(p.webProductId);
  }

  const stripeLive = existsSync(resolve(repoRoot, "checkout-api/src/stripeLive.ts"))
    ? readFileSync(resolve(repoRoot, "checkout-api/src/stripeLive.ts"), "utf8")
    : "";
  const handlers = existsSync(resolve(repoRoot, "checkout-api/src/handlers.ts"))
    ? readFileSync(resolve(repoRoot, "checkout-api/src/handlers.ts"), "utf8")
    : "";
  const server = existsSync(resolve(repoRoot, "checkout-api/src/server.ts"))
    ? readFileSync(resolve(repoRoot, "checkout-api/src/server.ts"), "utf8")
    : "";

  const liveSymbols = [
    "isLiveMode",
    "createLiveCheckoutUrl",
    "verifyStripeWebhook",
    "applyStripeCheckoutCompleted",
    "STRIPE_WEBHOOK_PATH",
  ];
  const liveSymbolsTs = liveSymbols.every((s) => stripeLive.includes(s))
    && handlers.includes("createLiveCheckoutUrl")
    && handlers.includes("isLiveMode");

  let kickoffWired = false;
  let measuredAtPhase = -1;
  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, STRIPE_LIVE_CHECKOUT.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    const phase16 = (kickoff.phases as any[])?.find((p) => p.phase === 16);
    gapClosed = kickoff.gaps?.stripeLiveCheckoutPartial === false;
    kickoffWired =
      phase16?.id === "stripe-live" &&
      phase16?.validate === "stripe:validate" &&
      measuredAtPhase >= 16 &&
      gapClosed;
  }

  const missingGates: string[] = [];
  for (const gate of STRIPE_LIVE_CHECKOUT.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    priceMapComplete: missingPriceProducts.length === 0,
    missingPriceProducts,
    liveSymbolsTs,
    webhookRouteWired:
      server.includes(STRIPE_LIVE_WEBHOOK_PATH) && server.includes("verifyStripeWebhook"),
    kickoffWired,
    gapClosed,
    measuredAtPhase,
    missingGates,
  };
}
