import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { CosmeticsIapSystem, FullUnlockSystem } from "../src/engine";

const shared = resolve(__dirname, "../../shared/billing");

function read(name: string) {
  return JSON.parse(readFileSync(resolve(shared, name), "utf8"));
}

describe("storeCatalogSync (post-1.0 Phase 6)", () => {
  it("catalog documents inputs and npm script", () => {
    const sync = read("store-catalog-sync.json");
    expect(sync.phase).toBe(6);
    expect(sync.schema).toBe("fish.billing.store_catalog_sync.v1");
    expect(sync.packageName).toBe("com.willio.jeanvilma.fishshopping");
    expect(sync.npmScript).toBe("billing:validate");
    expect(sync.inputs.entitlements).toContain("entitlements.json");
    expect(sync.inputs.playConsole).toContain("play-console-products.json");
    expect(sync.inputs.webCheckout).toContain("web-checkout-products.json");
  });

  it("entitlements match play/web billing and store expected catalogs", () => {
    const entitlements = read("entitlements.json");
    expect(entitlements.storeCatalogSyncPhase).toBe(6);
    const rows = [
      {
        sku: entitlements.fullUnlock.sku,
        androidProductId: entitlements.fullUnlock.androidProductId,
        webProductId: entitlements.fullUnlock.webProductId,
        grantsCosmetic: null as string | null,
      },
      ...entitlements.cosmetics.map((c: any) => ({
        sku: c.sku,
        androidProductId: c.androidProductId,
        webProductId: c.webProductId,
        grantsCosmetic: c.grantsCosmetic as string,
      })),
    ];

    expect(rows[0]!.sku).toBe(FullUnlockSystem.SKU);
    expect(rows[0]!.androidProductId).toBe(FullUnlockSystem.ANDROID_PRODUCT_ID);
    expect(rows[0]!.webProductId).toBe(FullUnlockSystem.WEB_PRODUCT_ID);
    expect(rows.length).toBe(1 + CosmeticsIapSystem.CATALOG.length);

    const play = read("play-billing.json");
    const web = read("web-billing.json");
    const consoleCatalog = read("play-console-products.json");
    const checkout = read("web-checkout-products.json");
    expect(consoleCatalog.packageName).toBe("com.willio.jeanvilma.fishshopping");
    expect(play.skus).toHaveLength(rows.length);
    expect(web.skus).toHaveLength(rows.length);
    expect(consoleCatalog.products).toHaveLength(rows.length);
    expect(checkout.products).toHaveLength(rows.length);

    for (const row of rows) {
      const p = play.skus.find((s: any) => s.sku === row.sku);
      const w = web.skus.find((s: any) => s.sku === row.sku);
      const c = consoleCatalog.products.find((s: any) => s.sku === row.sku);
      const x = checkout.products.find((s: any) => s.sku === row.sku);
      expect(p?.androidProductId).toBe(row.androidProductId);
      expect(w?.webProductId).toBe(row.webProductId);
      expect(w?.androidProductId).toBe(row.androidProductId);
      expect(c?.productId).toBe(row.androidProductId);
      expect(x?.webProductId).toBe(row.webProductId);
      expect(x?.androidProductId).toBe(row.androidProductId);
      if (row.grantsCosmetic) {
        const engine = CosmeticsIapSystem.BY_SKU.get(row.sku)!;
        expect(engine.androidProductId).toBe(row.androidProductId);
        expect(engine.webProductId).toBe(row.webProductId);
      }
    }
  });

  it("billing:validate script exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-store-catalog.ts"], {
      cwd: resolve(__dirname, ".."),
      encoding: "utf8",
    });
    expect(out).toContain("OK store catalog sync");
    expect(out).toContain(FullUnlockSystem.SKU);
  });
});
