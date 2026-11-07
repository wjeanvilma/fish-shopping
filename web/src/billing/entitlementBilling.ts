/**
 * Phase 23–24 — full-harbor unlock + optional cosmetics billing.
 * Web uses a local stub (restore via localStorage). Production stores can swap the backend.
 * Android mirrors this with Play Billing stub in app/.../billing.
 */
import entitlements from "../../../shared/billing/entitlements.json";
import { CosmeticsIapSystem, FullUnlockSystem } from "../engine";

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

export interface EntitlementRecord {
  sku: string;
  purchaseToken: string;
  /** Optional cloud / guest account association for recovery. */
  cloudAccountId: string | null;
  purchasedAtEpochMs: number;
}

export type PurchaseOutcome =
  | { ok: true; purchaseToken: string; alreadyOwned: boolean }
  | { ok: false; reason: string };

export interface RestoredEntitlement {
  sku: string;
  purchaseToken: string;
  grantsCosmetic: string | null;
}

export interface EntitlementBilling {
  readonly kind: "stub" | "memory";
  purchaseFullUnlock(cloudAccountId: string | null): Promise<PurchaseOutcome>;
  purchaseCosmetic(sku: string, cloudAccountId: string | null): Promise<PurchaseOutcome>;
  restore(cloudAccountId: string | null): Promise<{ owned: boolean; purchaseToken: string | null }>;
  /** Phase 24: restore every owned entitlement (full unlock + cosmetics). */
  restoreAll(cloudAccountId: string | null): Promise<RestoredEntitlement[]>;
  owned(): boolean;
  ownedCosmetic(sku: string): boolean;
  purchaseToken(): string | null;
  purchaseTokenForSku(sku: string): string | null;
}

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

export function createEntitlementBilling(override?: EntitlementBilling): EntitlementBilling {
  return override ?? new StubEntitlementBilling();
}
