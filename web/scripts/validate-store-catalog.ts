/**
 * Phase 6 (post-1.0) — store product catalog sync.
 * Cross-checks entitlements.json against Play/web billing tables and expected
 * Play Console / web checkout product lists.
 *
 * Usage:
 *   npm run billing:validate
 *   npx vite-node scripts/validate-store-catalog.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const shared = resolve(here, "../../shared/billing");

interface EntitlementRow {
  sku: string;
  androidProductId: string;
  webProductId: string;
  grantsCosmetic: string | null;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function entitlementsFromPack(raw: any): EntitlementRow[] {
  const rows: EntitlementRow[] = [
    {
      sku: raw.fullUnlock.sku,
      androidProductId: raw.fullUnlock.androidProductId,
      webProductId: raw.fullUnlock.webProductId,
      grantsCosmetic: null,
    },
  ];
  for (const c of raw.cosmetics as any[]) {
    rows.push({
      sku: c.sku,
      androidProductId: c.androidProductId,
      webProductId: c.webProductId,
      grantsCosmetic: c.grantsCosmetic ?? null,
    });
  }
  return rows;
}

function validate(): string[] {
  const errors: string[] = [];
  const sync = readJson(resolve(shared, "store-catalog-sync.json")) as any;
  const entitlementsRaw = readJson(resolve(shared, "entitlements.json")) as any;
  const playBilling = readJson(resolve(shared, "play-billing.json")) as any;
  const webBilling = readJson(resolve(shared, "web-billing.json")) as any;
  const playConsole = readJson(resolve(shared, "play-console-products.json")) as any;
  const webCheckout = readJson(resolve(shared, "web-checkout-products.json")) as any;

  if (sync.phase !== 6) errors.push(`store-catalog-sync phase ${sync.phase} != 6`);
  if (playConsole.packageName !== sync.packageName) {
    errors.push(`play-console packageName mismatch: ${playConsole.packageName}`);
  }

  const entitlements = entitlementsFromPack(entitlementsRaw);
  const playRows = (playBilling.skus as any[]).map((s) => ({
    sku: s.sku as string,
    androidProductId: s.androidProductId as string,
    grantsCosmetic: (s.grantsCosmetic ?? null) as string | null,
  }));
  const webRows = (webBilling.skus as any[]).map((s) => ({
    sku: s.sku as string,
    webProductId: s.webProductId as string,
    androidProductId: s.androidProductId as string,
    grantsCosmetic: (s.grantsCosmetic ?? null) as string | null,
  }));
  const consoleRows = (playConsole.products as any[]).map((p) => ({
    productId: p.productId as string,
    sku: p.sku as string,
  }));
  const checkoutRows = (webCheckout.products as any[]).map((p) => ({
    webProductId: p.webProductId as string,
    sku: p.sku as string,
    androidProductId: p.androidProductId as string,
  }));

  const entBySku = new Map(entitlements.map((r) => [r.sku, r]));
  const playBySku = new Map(playRows.map((r) => [r.sku, r]));
  const webBySku = new Map(webRows.map((r) => [r.sku, r]));
  const consoleBySku = new Map(consoleRows.map((r) => [r.sku, r]));
  const checkoutBySku = new Map(checkoutRows.map((r) => [r.sku, r]));

  const allSkus = new Set([
    ...entBySku.keys(),
    ...playBySku.keys(),
    ...webBySku.keys(),
    ...consoleBySku.keys(),
    ...checkoutBySku.keys(),
  ]);

  for (const sku of allSkus) {
    const e = entBySku.get(sku);
    const p = playBySku.get(sku);
    const w = webBySku.get(sku);
    const c = consoleBySku.get(sku);
    const x = checkoutBySku.get(sku);
    if (!e) {
      errors.push(`orphan store sku '${sku}' not in entitlements`);
      continue;
    }
    if (!p) errors.push(`entitlement '${sku}' missing from play-billing.json`);
    if (!w) errors.push(`entitlement '${sku}' missing from web-billing.json`);
    if (!c) errors.push(`entitlement '${sku}' missing from play-console-products.json`);
    if (!x) errors.push(`entitlement '${sku}' missing from web-checkout-products.json`);
    if (p && p.androidProductId !== e.androidProductId) {
      errors.push(`play-billing androidProductId mismatch for '${sku}'`);
    }
    if (p && p.grantsCosmetic !== e.grantsCosmetic) {
      errors.push(`play-billing grantsCosmetic mismatch for '${sku}'`);
    }
    if (w && w.webProductId !== e.webProductId) {
      errors.push(`web-billing webProductId mismatch for '${sku}'`);
    }
    if (w && w.androidProductId !== e.androidProductId) {
      errors.push(`web-billing androidProductId mismatch for '${sku}'`);
    }
    if (c && c.productId !== e.androidProductId) {
      errors.push(`play-console productId mismatch for '${sku}'`);
    }
    if (x && (x.webProductId !== e.webProductId || x.androidProductId !== e.androidProductId)) {
      errors.push(`web-checkout product id mismatch for '${sku}'`);
    }
  }

  const androidIds = entitlements.map((r) => r.androidProductId);
  if (new Set(androidIds).size !== androidIds.length) errors.push("duplicate androidProductId in entitlements");
  const webIds = entitlements.map((r) => r.webProductId);
  if (new Set(webIds).size !== webIds.length) errors.push("duplicate webProductId in entitlements");

  return errors;
}

function main(): number {
  try {
    const errors = validate();
    if (errors.length > 0) {
      console.error("Store catalog sync FAILED:");
      for (const e of errors) console.error(`  - ${e}`);
      return 1;
    }
    const entitlements = entitlementsFromPack(
      readJson(resolve(shared, "entitlements.json")) as any,
    );
    console.log(`OK store catalog sync (${entitlements.length} SKUs)`);
    for (const row of entitlements) {
      console.log(`  ${row.sku}  play=${row.androidProductId}  web=${row.webProductId}`);
    }
    return 0;
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }
}

process.exit(main());
