import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createEntitlementBilling,
  FULL_UNLOCK_SKU,
} from "../src/billing/entitlementBilling";
import { ProductionWebEntitlementBilling } from "../src/billing/productionWebEntitlementBilling";
import { WebBillingCatalog } from "../src/billing/webBillingCatalog";
import {
  readWebBillingEnv,
  WebBillingPath,
  webBillingReadiness,
} from "../src/billing/webBillingPath";
import { FakeWebStoreBridge } from "../src/billing/webStoreBridge";
import { CosmeticsIapSystem, FullUnlockSystem } from "../src/engine";

describe("webBilling (post-1.0 Phase 2)", () => {
  it("catalog matches entitlements, web-billing.json, and Android SKU parity", () => {
    const web = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/billing/web-billing.json"), "utf8"),
    );
    expect(web.phase).toBe(2);
    expect(web.schema).toBe(WebBillingPath.SCHEMA);
    expect(web.productionBackend).toBe("web");
    expect(web.localBackend).toBe("stub");
    expect(WebBillingPath.CHECKOUT_PATH).toBe("/v1/checkout");
    expect(WebBillingPath.ENTITLEMENTS_PATH).toBe("/v1/entitlements");
    expect(WebBillingPath.FULFILL_PATH).toBe("/v1/fulfill");

    const entitlements = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/billing/entitlements.json"), "utf8"),
    );
    expect(entitlements.webBillingPhase).toBe(2);
    expect(entitlements.fullUnlock.webProductId).toBe(FullUnlockSystem.WEB_PRODUCT_ID);
    expect(entitlements.fullUnlock.androidProductId).toBe(FullUnlockSystem.ANDROID_PRODUCT_ID);
    expect(WebBillingCatalog.FULL_UNLOCK.sku).toBe(FULL_UNLOCK_SKU);
    expect(WebBillingCatalog.FULL_UNLOCK.webProductId).toBe(FullUnlockSystem.WEB_PRODUCT_ID);

    expect(entitlements.cosmetics).toHaveLength(CosmeticsIapSystem.CATALOG.length);
    for (const row of entitlements.cosmetics) {
      const product = WebBillingCatalog.BY_SKU.get(row.sku)!;
      expect(product.webProductId).toBe(row.webProductId);
      expect(product.androidProductId).toBe(row.androidProductId);
      const engine = CosmeticsIapSystem.BY_SKU.get(row.sku)!;
      expect(engine.webProductId).toBe(row.webProductId);
      expect(engine.androidProductId).toBe(row.androidProductId);
    }

    const play = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/billing/play-billing.json"), "utf8"),
    );
    expect(play.skus).toHaveLength(web.skus.length);
    for (const row of web.skus) {
      const android = play.skus.find((s: { sku: string }) => s.sku === row.sku);
      expect(android?.androidProductId).toBe(row.androidProductId);
      expect(WebBillingCatalog.webProductIdForSku(row.sku)).toBe(row.webProductId);
    }

    const envExample = readFileSync(resolve(__dirname, "../.env.example"), "utf8");
    expect(envExample).toContain("VITE_BILLING_API_BASE=");
    expect(envExample).toContain("VITE_STRIPE_PUBLISHABLE_KEY=");
  });

  it("readiness requires API base unless force stub", () => {
    const missing = readWebBillingEnv({});
    expect(webBillingReadiness(missing).productionReady).toBe(false);
    expect(missing.missing).toContain("VITE_BILLING_API_BASE");

    const ready = readWebBillingEnv({ VITE_BILLING_API_BASE: "https://billing.example/api/" });
    expect(ready.apiBase).toBe("https://billing.example/api");
    expect(webBillingReadiness(ready).productionReady).toBe(true);

    const forced = readWebBillingEnv({
      VITE_BILLING_API_BASE: "https://billing.example/api",
      VITE_BILLING_FORCE_STUB: "true",
    });
    expect(webBillingReadiness(forced).productionReady).toBe(false);
  });

  it("createEntitlementBilling defaults to stub without env", () => {
    const billing = createEntitlementBilling();
    expect(billing.kind).toBe("stub");
  });

  it("fake web purchase and restore grants mapped SKUs", async () => {
    const bridge = new FakeWebStoreBridge();
    const billing = new ProductionWebEntitlementBilling(bridge, false);
    expect(billing.kind).toBe("web");
    expect(billing.owned()).toBe(false);

    const buy = await billing.purchaseFullUnlock("cloud-1");
    expect(buy.ok).toBe(true);
    if (!buy.ok) return;
    expect(buy.alreadyOwned).toBe(false);
    expect(buy.purchaseToken.startsWith("web-")).toBe(true);
    expect(billing.owned()).toBe(true);

    const cosmetic = CosmeticsIapSystem.CATALOG[0]!;
    const cos = await billing.purchaseCosmetic(cosmetic.sku, "cloud-1");
    expect(cos.ok).toBe(true);
    expect(billing.ownedCosmetic(cosmetic.sku)).toBe(true);

    const restored = await billing.restoreAll("cloud-1");
    expect(restored).toHaveLength(2);
    expect(restored.some((r) => r.sku === FULL_UNLOCK_SKU && r.grantsCosmetic === null)).toBe(true);
    expect(restored.some((r) => r.sku === cosmetic.sku && r.grantsCosmetic === cosmetic.grantsCosmetic)).toBe(true);

    const again = await billing.purchaseFullUnlock("cloud-1");
    expect(again.ok && again.alreadyOwned).toBe(true);
  });

  it("restore pulls seeded store purchases and fulfill return", async () => {
    const bridge = new FakeWebStoreBridge();
    bridge.seed(FullUnlockSystem.WEB_PRODUCT_ID, "tok-full");
    const billing = new ProductionWebEntitlementBilling(bridge, false);
    const restored = await billing.restoreAll(null);
    expect(restored).toHaveLength(1);
    expect(billing.purchaseToken()).toBe("tok-full");

    const fulfilled = await billing.completeCheckoutReturn("sess:fish.cosmetic.pearl_string", null);
    expect(fulfilled.some((r) => r.sku === "fish.cosmetic.pearl_string")).toBe(true);
    expect(billing.ownedCosmetic("fish.cosmetic.pearl_string")).toBe(true);
  });

  it("purchase surfaces store errors", async () => {
    const bridge = new FakeWebStoreBridge();
    bridge.failNextPurchase = "Card declined";
    const billing = new ProductionWebEntitlementBilling(bridge, false);
    const result = await billing.purchaseFullUnlock(null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("Card declined");
  });
});
