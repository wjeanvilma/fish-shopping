/**
 * Phase 23–24 stubs + Phase 2 (post-1.0) web production IAP path.
 * Local stub when checkout API env is unset; production uses ProductionWebEntitlementBilling.
 * Android mirrors this with Play Billing in app/.../billing.
 */
import entitlements from "../../../shared/billing/entitlements.json";
import { CosmeticsIapSystem, FullUnlockSystem } from "../engine";
import type {
  EntitlementBilling,
  EntitlementRecord,
  PurchaseOutcome,
  RestoredEntitlement,
} from "./billingTypes";
import { ProductionWebEntitlementBilling } from "./productionWebEntitlementBilling";
import { readWebBillingEnv, webBillingReadiness } from "./webBillingPath";
import { HttpWebStoreBridge } from "./webStoreBridge";

export type {
  EntitlementBilling,
  EntitlementRecord,
  PurchaseOutcome,
  RestoredEntitlement,
} from "./billingTypes";

export const FULL_UNLOCK_SKU = entitlements.fullUnlock.sku as string;
export const FREE_HARBOR_ID = entitlements.freeHarborId as string;
export const FULL_UNLOCK_CATALOG = entitlements.fullUnlock;
export const COSMETIC_CATALOG = entitlements.cosmetics as Array<{
  id: string;
  sku: string;
  androidProductId: string;
  webProductId: string;
  grantsCosmetic: string;
  type: string;
  powerNeutral: boolean;
  title: string;
  description: string;
}>;

const STORAGE_KEY = "fish-shopping-entitlements";

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

/** Web / test stub — non-consumables stored locally; associates with guest cloud id when present. */
export class StubEntitlementBilling implements EntitlementBilling {
  readonly kind = "stub" as const;

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
    const hit = findSku(loadRecords(), FULL_UNLOCK_SKU, cloudAccountId)
      ?? loadRecords().find((r) => r.sku === FULL_UNLOCK_SKU)
      ?? null;
    if (!hit) return { owned: false, purchaseToken: null };
    if (cloudAccountId && !hit.cloudAccountId) {
      saveRecords(associateCloud(loadRecords(), hit.purchaseToken, cloudAccountId));
    }
    return { owned: true, purchaseToken: hit.purchaseToken };
  }

  async restoreAll(cloudAccountId: string | null): Promise<RestoredEntitlement[]> {
    let records = loadRecords();
    const out: RestoredEntitlement[] = [];
    const skus = [FULL_UNLOCK_SKU, ...COSMETIC_CATALOG.map((c) => c.sku)];
    for (const sku of skus) {
      const hit = findSku(records, sku, cloudAccountId) ?? records.find((r) => r.sku === sku);
      if (!hit) continue;
      if (cloudAccountId && !hit.cloudAccountId) {
        records = associateCloud(records, hit.purchaseToken, cloudAccountId);
        saveRecords(records);
      }
      out.push({
        sku,
        purchaseToken: hit.purchaseToken,
        grantsCosmetic: cosmeticGrant(sku),
      });
    }
    return out;
  }

  owned(): boolean {
    return loadRecords().some((r) => r.sku === FULL_UNLOCK_SKU);
  }

  ownedCosmetic(sku: string): boolean {
    return loadRecords().some((r) => r.sku === sku);
  }

  purchaseToken(): string | null {
    return loadRecords().find((r) => r.sku === FULL_UNLOCK_SKU)?.purchaseToken ?? null;
  }

  purchaseTokenForSku(sku: string): string | null {
    return loadRecords().find((r) => r.sku === sku)?.purchaseToken ?? null;
  }

  private async purchaseSku(sku: string, cloudAccountId: string | null): Promise<PurchaseOutcome> {
    const existing = findSku(loadRecords(), sku, cloudAccountId);
    if (existing) {
      return { ok: true, purchaseToken: existing.purchaseToken, alreadyOwned: true };
    }
    const purchaseToken = `web-stub-${crypto.randomUUID()}`;
    const records = loadRecords();
    records.push({
      sku,
      purchaseToken,
      cloudAccountId,
      purchasedAtEpochMs: Date.now(),
    });
    saveRecords(records);
    return { ok: true, purchaseToken, alreadyOwned: false };
  }
}

/** In-memory billing for unit tests. */
export class MemoryEntitlementBilling implements EntitlementBilling {
  readonly kind = "memory" as const;
  private records: EntitlementRecord[] = [];

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
    const hit = findSku(this.records, FULL_UNLOCK_SKU, cloudAccountId);
    if (!hit) return { owned: false, purchaseToken: null };
    if (cloudAccountId && !hit.cloudAccountId) {
      this.records = associateCloud(this.records, hit.purchaseToken, cloudAccountId);
    }
    return { owned: true, purchaseToken: hit.purchaseToken };
  }

  async restoreAll(cloudAccountId: string | null): Promise<RestoredEntitlement[]> {
    const out: RestoredEntitlement[] = [];
    const skus = [FULL_UNLOCK_SKU, ...COSMETIC_CATALOG.map((c) => c.sku)];
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
    return out;
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
      }
      return { ok: true, purchaseToken: existing.purchaseToken, alreadyOwned: true };
    }
    const purchaseToken = `mem-${crypto.randomUUID()}`;
    this.records.push({
      sku,
      purchaseToken,
      cloudAccountId,
      purchasedAtEpochMs: Date.now(),
    });
    return { ok: true, purchaseToken, alreadyOwned: false };
  }
}

export function grantRequestId(purchaseToken: string): string {
  return FullUnlockSystem.requestIdForPurchaseToken(purchaseToken);
}

export function cosmeticGrantRequestId(sku: string, purchaseToken: string): string {
  return CosmeticsIapSystem.requestIdForPurchaseToken(sku, purchaseToken);
}

/** Force production web path even without env (tests). */
let forceWebProduction = false;
export function setForceWebProduction(value: boolean): void {
  forceWebProduction = value;
}

function readRuntimeBillingEnv(): ReturnType<typeof readWebBillingEnv> {
  const meta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  const fromMeta = readWebBillingEnv(meta);
  if (fromMeta.apiBase || fromMeta.forceStub) return fromMeta;
  if (typeof process !== "undefined") {
    return readWebBillingEnv({
      VITE_BILLING_API_BASE: process.env?.VITE_BILLING_API_BASE,
      VITE_STRIPE_PUBLISHABLE_KEY: process.env?.VITE_STRIPE_PUBLISHABLE_KEY,
      VITE_BILLING_FORCE_STUB: process.env?.VITE_BILLING_FORCE_STUB,
    });
  }
  return fromMeta;
}

export function createEntitlementBilling(override?: EntitlementBilling): EntitlementBilling {
  if (override) return override;
  const env = readRuntimeBillingEnv();
  const ready = webBillingReadiness(env);
  if ((ready.productionReady || forceWebProduction) && env.apiBase) {
    return new ProductionWebEntitlementBilling(new HttpWebStoreBridge(env.apiBase));
  }
  if (forceWebProduction && !env.apiBase) {
    // Tests may inject bridge via override; without base stay on stub.
    return new StubEntitlementBilling();
  }
  return new StubEntitlementBilling();
}

export function isProductionWebBilling(billing: EntitlementBilling): billing is ProductionWebEntitlementBilling {
  return billing.kind === "web";
}
