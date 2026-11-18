/**
 * Finish 4.0 Phase 25 — Stripe/checkout live-ready catalog ops
 * (mirrors shared/ship/stripe-ops-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/stripe-ops-4.json";
import opsJson from "../../../shared/ops/stripe-ops-4.json";

export interface StripeOps4ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  stripeOps4Marker: string;
  closesGap: string;
  opsCatalog: string;
  extendsStripeLive: string;
  productsCatalog: string;
  storeCatalogSync: string;
  skuFloor: number;
  cosmeticSkuFloor: number;
  priceMapFloor: number;
  readinessPath: string;
  webhookIdempotencyRequired: boolean;
  cutoverChecklistMin: number;
  manualOpsMin: number;
  parityFixture: string;
  validateScript: string;
  kickoffCatalog: string;
  authorTool: string;
  checklist: string[];
  preflightGates: string[];
}

export interface StripeOps4OpsCatalog {
  phase: number;
  schema: string;
  skuFloor: number;
  cosmeticSkuFloor: number;
  priceMapFloor: number;
  readinessPath: string;
  webhookIdempotency: { required: boolean };
  cutoverChecklist: string[];
  manualOps: Array<{ id: string; title: string; body: string }>;
}

export const STRIPE_OPS_4 = catalogJson as unknown as StripeOps4ShipCatalog;
export const STRIPE_OPS_4_OPS = opsJson as unknown as StripeOps4OpsCatalog;
export const STRIPE_OPS_4_PHASE = STRIPE_OPS_4.phase;
export const STRIPE_OPS_4_SCHEMA = STRIPE_OPS_4.schema;
export const STRIPE_OPS_4_MARKER = STRIPE_OPS_4.stripeOps4Marker;
export const STRIPE_OPS_SKU_FLOOR = STRIPE_OPS_4.skuFloor;
export const STRIPE_OPS_PRICE_MAP_FLOOR = STRIPE_OPS_4.priceMapFloor;
export const STRIPE_OPS_READINESS_PATH = STRIPE_OPS_4.readinessPath;

export interface StripeOps4Measure {
  skuCount: number;
  cosmeticSkuCount: number;
  priceMappedCount: number;
  skusEnough: boolean;
  cosmeticsEnough: boolean;
  priceMapEnough: boolean;
  webhookIdempotencyWired: boolean;
  readinessWired: boolean;
  gapClosed: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureStripeOps4(repoRoot: string): StripeOps4Measure {
  const productsPath = resolve(repoRoot, STRIPE_OPS_4.productsCatalog);
  const kickoffPath = resolve(repoRoot, STRIPE_OPS_4.kickoffCatalog);
  const storePath = resolve(repoRoot, "checkout-api/src/store.ts");
  const livePath = resolve(repoRoot, "checkout-api/src/stripeLive.ts");
  const serverPath = resolve(repoRoot, "checkout-api/src/server.ts");

  const products = existsSync(productsPath)
    ? (readJson(productsPath).products as Array<{
        status?: string;
        sku?: string;
        stripePriceId?: string;
      }>)
    : [];
  const active = products.filter((p) => p.status === "active");
  const cosmeticSkuCount = active.filter((p) => (p.sku ?? "").includes(".cosmetic.")).length;
  const priceMappedCount = active.filter((p) => (p.stripePriceId ?? "").trim().length > 0).length;

  const storeTs = existsSync(storePath) ? readFileSync(storePath, "utf8") : "";
  const liveTs = existsSync(livePath) ? readFileSync(livePath, "utf8") : "";
  const serverTs = existsSync(serverPath) ? readFileSync(serverPath, "utf8") : "";

  let gapClosed = false;
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.stripeOpsIncomplete === false;
  }

  const missingGates: string[] = [];
  for (const gate of STRIPE_OPS_4.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    skuCount: active.length,
    cosmeticSkuCount,
    priceMappedCount,
    skusEnough: active.length >= STRIPE_OPS_SKU_FLOOR,
    cosmeticsEnough: cosmeticSkuCount >= STRIPE_OPS_4.cosmeticSkuFloor,
    priceMapEnough: priceMappedCount >= STRIPE_OPS_PRICE_MAP_FLOOR,
    webhookIdempotencyWired:
      storeTs.includes("processedStripeEventIds") &&
      liveTs.includes("hasProcessedStripeEvent") &&
      liveTs.includes("duplicate"),
    readinessWired:
      liveTs.includes("stripeOpsReadiness") &&
      serverTs.includes(STRIPE_OPS_READINESS_PATH) &&
      STRIPE_OPS_4_OPS.readinessPath === STRIPE_OPS_READINESS_PATH,
    gapClosed,
    missingGates,
  };
}
