/**
 * Phase 2 (post-1.0) — logical SKU ↔ web product id map.
 * Mirrors shared/billing/entitlements.json webProductId fields (same SKUs as Android).
 */
import entitlements from "../../../shared/billing/entitlements.json";
import { CosmeticsIapSystem, FullUnlockSystem } from "../engine";

export interface WebBillingProduct {
  sku: string;
  webProductId: string;
  androidProductId: string;
  grantsCosmetic: string | null;
}

const cosmeticRows = entitlements.cosmetics as Array<{
  sku: string;
  webProductId: string;
  androidProductId: string;
  grantsCosmetic: string;
}>;

export const WebBillingCatalog = {
  FULL_UNLOCK: {
    sku: FullUnlockSystem.SKU,
    webProductId: entitlements.fullUnlock.webProductId as string,
    androidProductId: entitlements.fullUnlock.androidProductId as string,
    grantsCosmetic: null,
  } satisfies WebBillingProduct,

  COSMETICS: cosmeticRows.map(
    (row): WebBillingProduct => ({
      sku: row.sku,
      webProductId: row.webProductId,
      androidProductId: row.androidProductId,
      grantsCosmetic: row.grantsCosmetic,
    }),
  ),

  get ALL(): WebBillingProduct[] {
    return [this.FULL_UNLOCK, ...this.COSMETICS];
  },

  get BY_SKU(): Map<string, WebBillingProduct> {
    return new Map(this.ALL.map((p) => [p.sku, p]));
  },

  get BY_WEB_PRODUCT_ID(): Map<string, WebBillingProduct> {
    return new Map(this.ALL.map((p) => [p.webProductId, p]));
  },

  get WEB_PRODUCT_IDS(): string[] {
    return this.ALL.map((p) => p.webProductId);
  },

  skuForWebProductId(productId: string): string | null {
    return this.BY_WEB_PRODUCT_ID.get(productId)?.sku ?? null;
  },

  webProductIdForSku(sku: string): string | null {
    return this.BY_SKU.get(sku)?.webProductId ?? null;
  },

  /** Parity: every CosmeticsIapSystem SKU has a web product id. */
  assertEngineParity(): void {
    for (const sku of CosmeticsIapSystem.CATALOG) {
      if (!this.BY_SKU.has(sku.sku)) {
        throw new Error(`Missing web billing product for ${sku.sku}`);
      }
    }
  },
};
