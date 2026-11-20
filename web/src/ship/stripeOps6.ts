/**
 * Finish 6.0 Phase 25 — Stripe/checkout live-ready catalog ops 6
 * (mirrors shared/ship/stripe-ops-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/stripe-ops-6.json";
import opsJson from "../../../shared/ops/stripe-ops-6.json";

export interface StripeOps6ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  stripeOps6Marker: string;
  closesGap: string;
  opsCatalog: string;
  extendsStripeOps5: string;
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
  softStripeOps5Validate: string;
  kickoffCatalog: string;
  authorTool: string;
  checklist: string[];
  preflightGates: string[];
}

export interface StripeOps6OpsCatalog {
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

export const STRIPE_OPS_6 = catalogJson as unknown as StripeOps6ShipCatalog;
export const STRIPE_OPS_6_OPS = opsJson as unknown as StripeOps6OpsCatalog;
export const STRIPE_OPS_6_PHASE = STRIPE_OPS_6.phase;
export const STRIPE_OPS_6_SCHEMA = STRIPE_OPS_6.schema;
export const STRIPE_OPS_6_MARKER = STRIPE_OPS_6.stripeOps6Marker;
export const STRIPE_OPS_6_SKU_FLOOR = STRIPE_OPS_6.skuFloor;
export const STRIPE_OPS_6_COSMETIC_FLOOR = STRIPE_OPS_6.cosmeticSkuFloor;
export const STRIPE_OPS_6_PRICE_MAP_FLOOR = STRIPE_OPS_6.priceMapFloor;
export const STRIPE_OPS_6_READINESS_PATH = STRIPE_OPS_6.readinessPath;

export interface StripeOps6Measure {
  skuCount: number;
  cosmeticSkuCount: number;
  priceMappedCount: number;
  skusEnough: boolean;
  cosmeticsEnough: boolean;
  priceMapEnough: boolean;
  entitlementDriftOk: boolean;
  webhookIdempotencyWired: boolean;
  readinessWired: boolean;
  finish6ReadinessWired: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureStripeOps6(repoRoot: string): StripeOps6Measure {
  const productsPath = resolve(repoRoot, STRIPE_OPS_6.productsCatalog);
  const entitlementsPath = resolve(repoRoot, "shared/billing/entitlements.json");
  const kickoffPath = resolve(repoRoot, STRIPE_OPS_6.kickoffCatalog);
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
    gapClosed = kickoff?.gaps?.stripeOps6Incomplete === false;
    const phase25 = (kickoff.phases as any[])?.find((p) => p.phase === 25);
    kickoffWired = phase25?.id === "stripe-ops-6" && phase25?.validate === "stripeops6:validate";
  }

  const missingGates: string[] = [];
  for (const gate of STRIPE_OPS_6.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    skuCount: active.length,
    cosmeticSkuCount,
    priceMappedCount,
    skusEnough: active.length >= STRIPE_OPS_6_SKU_FLOOR,
    cosmeticsEnough: cosmeticSkuCount >= STRIPE_OPS_6_COSMETIC_FLOOR,
    priceMapEnough: priceMappedCount >= STRIPE_OPS_6_PRICE_MAP_FLOOR,
    entitlementDriftOk,
    webhookIdempotencyWired:
      storeTs.includes("processedStripeEventIds") &&
      liveTs.includes("hasProcessedStripeEvent") &&
      liveTs.includes("duplicate"),
    readinessWired:
      liveTs.includes("stripeOpsReadiness") &&
      serverTs.includes(STRIPE_OPS_6_READINESS_PATH) &&
      STRIPE_OPS_6_OPS.readinessPath === STRIPE_OPS_6_READINESS_PATH,
    finish6ReadinessWired:
      liveTs.includes("finish6CatalogOk") &&
      liveTs.includes("STRIPE_OPS_6_SKU_FLOOR") &&
      liveTs.includes("cosmeticSkuCount"),
    gapClosed,
    kickoffWired,
    missingGates,
  };
}
