/**
 * Phase 3 (post-1.0) — idempotent entitlement reconcile (mirrors game-core EntitlementReconcile).
 */
import reconcileCatalog from "../../../shared/billing/entitlement-reconcile.json";
import { CosmeticsIapSystem, FullUnlockSystem, type GameState } from "../engine";

export const EntitlementReconcilePath = {
  PHASE: reconcileCatalog.phase as number,
  SCHEMA: reconcileCatalog.schema as string,
  ANDROID_PREFS: reconcileCatalog.crashSafety.androidPrefs as string,
  WEB_STORAGE_KEY: reconcileCatalog.crashSafety.webStorageKey as string,
};

export interface StoreOwned {
  sku: string;
  purchaseToken: string;
  grantsCosmetic: string | null;
}

export interface SaveSnapshot {
  fullHarborUnlock: boolean;
  unlockedCosmetics: Set<string>;
  purchaseReceiptIds: Set<string>;
}

export interface GrantNeed {
  sku: string;
  purchaseToken: string;
  requestId: string;
  cosmeticId: string | null;
  reason: string;
}

export function snapshotOf(state: GameState): SaveSnapshot {
  return {
    fullHarborUnlock: state.fullHarborUnlock,
    unlockedCosmetics: new Set(state.unlockedCosmetics),
    purchaseReceiptIds: new Set(state.purchaseReceipts.keys()),
  };
}

export function requestIdFor(store: StoreOwned): string {
  if (store.grantsCosmetic) {
    return CosmeticsIapSystem.requestIdForPurchaseToken(store.sku, store.purchaseToken);
  }
  return FullUnlockSystem.requestIdForPurchaseToken(store.purchaseToken);
}

export function mergeStoreAndPending(store: StoreOwned[], pending: StoreOwned[]): StoreOwned[] {
  const bySku = new Map<string, StoreOwned>();
  for (const row of store) bySku.set(row.sku, row);
  for (const row of pending) {
    if (!bySku.has(row.sku)) bySku.set(row.sku, row);
  }
  return [...bySku.values()];
}

export function neededGrants(owned: StoreOwned[], save: SaveSnapshot): GrantNeed[] {
  const out: GrantNeed[] = [];
  for (const row of owned) {
    const requestId = requestIdFor(row);
    const cosmeticId = row.grantsCosmetic;
    if (cosmeticId) {
      const flagMissing = !save.unlockedCosmetics.has(cosmeticId);
      const receiptMissing = !save.purchaseReceiptIds.has(requestId);
      if (flagMissing || receiptMissing) {
        out.push({
          sku: row.sku,
          purchaseToken: row.purchaseToken,
          requestId,
          cosmeticId,
          reason: flagMissing && receiptMissing
            ? "missing_flag_and_receipt"
            : flagMissing
              ? "missing_flag"
              : "missing_receipt",
        });
      }
    } else {
      const flagMissing = !save.fullHarborUnlock;
      const receiptMissing = !save.purchaseReceiptIds.has(requestId);
      if (flagMissing || receiptMissing) {
        out.push({
          sku: row.sku,
          purchaseToken: row.purchaseToken,
          requestId,
          cosmeticId: null,
          reason: flagMissing && receiptMissing
            ? "missing_flag_and_receipt"
            : flagMissing
              ? "missing_flag"
              : "missing_receipt",
        });
      }
    }
  }
  return out;
}

export function alreadySatisfiedCount(owned: StoreOwned[], save: SaveSnapshot): number {
  return owned.length - neededGrants(owned, save).length;
}
