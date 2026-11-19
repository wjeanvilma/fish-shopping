/**
 * Finish 5.0 Phase 25 — Stripe/checkout live-ready catalog ops 5
 * (mirrors shared/ship/stripe-ops-5.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/stripe-ops-5.json";
import opsJson from "../../../shared/ops/stripe-ops-5.json";

export interface StripeOps5ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  stripeOps5Marker: string;
  closesGap: string;
  opsCatalog: string;
  extendsStripeOps4: string;
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
  softStripeOps4Validate: string;
  kickoffCatalog: string;
  authorTool: string;
  checklist: string[];
  preflightGates: string[];
}

export interface StripeOps5OpsCatalog {
  phase: number;
  schema: string;
  skuFloor: number;
  cosmeticSkuFloor: number;
  priceMapFloor: number;
  readinessPath: string;
  webhookIdempotency: { required: boolean };
  cutoverChecklist: string[];
  manualOps: Array<{ id: string; title: string; body: string }>;
  readinessFields: string[];
}

export const STRIPE_OPS_5 = catalogJson as unknown as StripeOps5ShipCatalog;
export const STRIPE_OPS_5_OPS = opsJson as unknown as StripeOps5OpsCatalog;
export const STRIPE_OPS_5_PHASE = STRIPE_OPS_5.phase;
export const STRIPE_OPS_5_SCHEMA = STRIPE_OPS_5.schema;
export const STRIPE_OPS_5_MARKER = STRIPE_OPS_5.stripeOps5Marker;
export const STRIPE_OPS_5_SKU_FLOOR = STRIPE_OPS_5.skuFloor;
export const STRIPE_OPS_5_COSMETIC_FLOOR = STRIPE_OPS_5.cosmeticSkuFloor;
export const STRIPE_OPS_5_PRICE_MAP_FLOOR = STRIPE_OPS_5.priceMapFloor;
export const STRIPE_OPS_5_READINESS_PATH = STRIPE_OPS_5.readinessPath;

export interface StripeOps5Measure {
  skuCount: number;
  cosmeticSkuCount: number;
  priceMappedCount: number;
  skusEnough: boolean;
  cosmeticsEnough: boolean;
  priceMapEnough: boolean;
  entitlementDriftOk: boolean;
  webhookIdempotencyWired: boolean;
  readinessWired: boolean;
  finish5ReadinessWired: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureStripeOps5(repoRoot: string): StripeOps5Measure {
  const productsPath = resolve(repoRoot, STRIPE_OPS_5.productsCatalog);
  const entitlementsPath = resolve(repoRoot, "shared/billing/entitlements.json");
  const kickoffPath = resolve(repoRoot, STRIPE_OPS_5.kickoffCatalog);
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

  const ents = existsSync(entitlementsPath) ? readJson(entitlementsPath) : {};
  const entSkus = new Set<string>();
  if (ents?.fullUnlock?.sku) entSkus.add(ents.fullUnlock.sku);
  for (const c of ents?.cosmetics ?? []) {
    if (c?.sku) entSkus.add(c.sku);
  }
  const checkoutSkus = new Set(active.map((p) => p.sku).filter(Boolean) as string[]);
  const entitlementDriftOk = [...entSkus].every((sku) => checkoutSkus.has(sku));

  const storeTs = existsSync(storePath) ? readFileSync(storePath, "utf8") : "";
  const liveTs = existsSync(livePath) ? readFileSync(livePath, "utf8") : "";
  const serverTs = existsSync(serverPath) ? readFileSync(serverPath, "utf8") : "";

  let gapClosed = false;
  let kickoffWired = false;
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.stripeOps5Incomplete === false;
    const phase25 = (kickoff.phases as any[])?.find((p) => p.phase === 25);
    kickoffWired = phase25?.id === "stripe-ops-5" && phase25?.validate === "stripeops5:validate";
  }

  const missingGates: string[] = [];
  for (const gate of STRIPE_OPS_5.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    skuCount: active.length,
    cosmeticSkuCount,
    priceMappedCount,
    skusEnough: active.length >= STRIPE_OPS_5_SKU_FLOOR,
    cosmeticsEnough: cosmeticSkuCount >= STRIPE_OPS_5_COSMETIC_FLOOR,
    priceMapEnough: priceMappedCount >= STRIPE_OPS_5_PRICE_MAP_FLOOR,
    entitlementDriftOk,
    webhookIdempotencyWired:
      storeTs.includes("processedStripeEventIds") &&
      liveTs.includes("hasProcessedStripeEvent") &&
      liveTs.includes("duplicate"),
    readinessWired:
      liveTs.includes("stripeOpsReadiness") &&
      serverTs.includes(STRIPE_OPS_5_READINESS_PATH) &&
      STRIPE_OPS_5_OPS.readinessPath === STRIPE_OPS_5_READINESS_PATH,
    finish5ReadinessWired:
      liveTs.includes("finish5CatalogOk") &&
      liveTs.includes("STRIPE_OPS_5_SKU_FLOOR") &&
      liveTs.includes("cosmeticSkuCount"),
    gapClosed,
    kickoffWired,
    missingGates,
  };
}
