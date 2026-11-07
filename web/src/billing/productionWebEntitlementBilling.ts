/**
 * Phase 2 (post-1.0) — production web entitlement billing (checkout API + local mirror).
 */
import { CosmeticsIapSystem, FullUnlockSystem } from "../engine";
import { WebBillingCatalog } from "./webBillingCatalog";
import type {
  EntitlementBilling,
  EntitlementRecord,
  PurchaseOutcome,
  RestoredEntitlement,
} from "./billingTypes";
import type { WebStoreBridge } from "./webStoreBridge";

const STORAGE_KEY = "fish-shopping-entitlements";
const FULL_UNLOCK_SKU = FullUnlockSystem.SKU;
const COSMETIC_SKUS = CosmeticsIapSystem.CATALOG.map((c) => c.sku);

function loadRecords(): EntitlementRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EntitlementRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords(records: EntitlementRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // private mode / quota
  }
}

function findSku(
  records: EntitlementRecord[],
  sku: string,
  cloudAccountId: string | null,
): EntitlementRecord | undefined {
  const matches = records.filter((r) => r.sku === sku);
  if (cloudAccountId) {
    const linked = matches.find((r) => r.cloudAccountId === cloudAccountId);
    if (linked) return linked;
  }
  return matches.find((r) => !r.cloudAccountId) ?? matches[0];
}

function cosmeticGrant(sku: string): string | null {
  return CosmeticsIapSystem.BY_SKU.get(sku)?.grantsCosmetic ?? null;
}

function associateCloud(
  records: EntitlementRecord[],
  purchaseToken: string,
  cloudAccountId: string,
): EntitlementRecord[] {
  return records.map((r) =>
    r.purchaseToken === purchaseToken && !r.cloudAccountId ? { ...r, cloudAccountId } : r,
  );
}

export class ProductionWebEntitlementBilling implements EntitlementBilling {
  readonly kind = "web" as const;
  private records: EntitlementRecord[];

  constructor(
    private readonly bridge: WebStoreBridge,
    private readonly persist: boolean = true,
  ) {
    this.records = this.persist ? loadRecords() : [];
  }

  async purchaseFullUnlock(cloudAccountId: string | null): Promise<PurchaseOutcome> {
    return this.purchaseSku(FULL_UNLOCK_SKU, cloudAccountId);
  }

  async purchaseCosmetic(sku: string, cloudAccountId: string | null): Promise<PurchaseOutcome> {
    if (!CosmeticsIapSystem.BY_SKU.has(sku)) {
      return { ok: false, reason: "Unknown cosmetic SKU" };
    }
    return this.purchaseSku(sku, cloudAccountId);
  }

  async restore(cloudAccountId: string | null): Promise<{ owned: boolean; purchaseToken: string | null }> {
    const all = await this.restoreAll(cloudAccountId);
    const hit = all.find((r) => r.sku === FullUnlockSystem.SKU);
    if (!hit) return { owned: false, purchaseToken: null };
    return { owned: true, purchaseToken: hit.purchaseToken };
  }

  async restoreAll(cloudAccountId: string | null): Promise<RestoredEntitlement[]> {
    try {
      const storeOwned = await this.bridge.queryOwned(cloudAccountId);
      for (const row of storeOwned) {
        const product = WebBillingCatalog.BY_WEB_PRODUCT_ID.get(row.webProductId);
        if (!product) continue;
        this.upsert(product.sku, row.purchaseToken, cloudAccountId);
      }
      this.flush();
    } catch {
      // Fall back to local mirror when the API is unreachable.
    }
    return this.localRestored(cloudAccountId);
  }

  /** Apply `?billing=success&session_id=` after hosted checkout return. */
  async completeCheckoutReturn(
    sessionId: string,
    cloudAccountId: string | null,
  ): Promise<RestoredEntitlement[]> {
    const fulfilled = await this.bridge.fulfillReturn(sessionId, cloudAccountId);
    for (const row of fulfilled) {
      const product = WebBillingCatalog.BY_WEB_PRODUCT_ID.get(row.webProductId);
      if (!product) continue;
      this.upsert(product.sku, row.purchaseToken, cloudAccountId);
    }
    this.flush();
    return this.localRestored(cloudAccountId);
  }

  owned(): boolean {
    return this.records.some((r) => r.sku === FULL_UNLOCK_SKU);
  }

  ownedCosmetic(sku: string): boolean {
    return this.records.some((r) => r.sku === sku);
  }

  purchaseToken(): string | null {
    return this.records.find((r) => r.sku === FULL_UNLOCK_SKU)?.purchaseToken ?? null;
  }

  purchaseTokenForSku(sku: string): string | null {
    return this.records.find((r) => r.sku === sku)?.purchaseToken ?? null;
  }

  private async purchaseSku(sku: string, cloudAccountId: string | null): Promise<PurchaseOutcome> {
    const existing = findSku(this.records, sku, cloudAccountId);
    if (existing) {
      if (cloudAccountId && !existing.cloudAccountId) {
        this.records = associateCloud(this.records, existing.purchaseToken, cloudAccountId);
        this.flush();
      }
      return { ok: true, purchaseToken: existing.purchaseToken, alreadyOwned: true };
    }
    const webProductId = WebBillingCatalog.webProductIdForSku(sku);
    if (!webProductId) {
      return { ok: false, reason: "Unknown SKU" };
    }
    const alreadyLocal = this.records.some((r) => r.sku === sku);
    try {
      const bought = await this.bridge.purchase(webProductId, cloudAccountId);
      const mappedSku = WebBillingCatalog.skuForWebProductId(bought.webProductId) ?? sku;
      const already = alreadyLocal || this.records.some((r) => r.sku === mappedSku);
      this.upsert(mappedSku, bought.purchaseToken, cloudAccountId);
      this.flush();
      return { ok: true, purchaseToken: bought.purchaseToken, alreadyOwned: already };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "Purchase failed" };
    }
  }

  private upsert(sku: string, purchaseToken: string, cloudAccountId: string | null): void {
    const existingIdx = this.records.findIndex((r) => r.sku === sku && r.purchaseToken === purchaseToken);
    if (existingIdx >= 0) {
      const hit = this.records[existingIdx]!;
      if (cloudAccountId && !hit.cloudAccountId) {
        this.records[existingIdx] = { ...hit, cloudAccountId };
      }
      return;
    }
    this.records = this.records.filter((r) => r.sku !== sku);
    this.records.push({
      sku,
      purchaseToken,
      cloudAccountId,
      purchasedAtEpochMs: Date.now(),
    });
  }

  private localRestored(cloudAccountId: string | null): RestoredEntitlement[] {
    const skus = [FULL_UNLOCK_SKU, ...COSMETIC_SKUS];
    const out: RestoredEntitlement[] = [];
    for (const sku of skus) {
      const hit = findSku(this.records, sku, cloudAccountId) ?? this.records.find((r) => r.sku === sku);
      if (!hit) continue;
      if (cloudAccountId && !hit.cloudAccountId) {
        this.records = associateCloud(this.records, hit.purchaseToken, cloudAccountId);
      }
      out.push({
        sku,
        purchaseToken: hit.purchaseToken,
        grantsCosmetic: cosmeticGrant(sku),
      });
    }
    this.flush();
    return out;
  }

  private flush(): void {
    if (this.persist) saveRecords(this.records);
  }
}
