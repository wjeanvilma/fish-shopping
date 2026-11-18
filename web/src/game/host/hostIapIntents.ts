/**
 * Finish 4.0 Phase 6 — web billing / entitlement purchase + restore for GameHost.
 */
import { CosmeticsIapSystem, FullUnlockSystem } from "../../engine";
import type { HostIapIntentHost } from "./hostIntentHost";

export class HostIapIntents {
  constructor(private readonly host: HostIapIntentHost) {}

  purchaseFullHarborUnlock(): void {
    void this.host.billing.purchaseFullUnlock(this.host.cloudAccountId()).then((result) => {
      if (!result.ok) {
        this.host.say(result.reason);
        return;
      }
      this.host.pendingEntitlements.enqueue(FullUnlockSystem.SKU, result.purchaseToken, null);
      this.host.applyStoreOwned(
        [{ sku: FullUnlockSystem.SKU, purchaseToken: result.purchaseToken, grantsCosmetic: null }],
        false,
      );
    });
  }

  restoreFullHarborUnlock(): void {
    void this.host.billing.restore(this.host.cloudAccountId()).then((result) => {
      if (!result.owned || !result.purchaseToken) {
        this.host.say("No harbor unlock to restore");
        return;
      }
      this.host.pendingEntitlements.enqueue(FullUnlockSystem.SKU, result.purchaseToken, null);
      this.host.applyStoreOwned(
        [{ sku: FullUnlockSystem.SKU, purchaseToken: result.purchaseToken, grantsCosmetic: null }],
        true,
      );
    });
  }

  purchaseIapCosmetic(sku: string): void {
    void this.host.billing.purchaseCosmetic(sku, this.host.cloudAccountId()).then((result) => {
      if (!result.ok) {
        this.host.say(result.reason);
        return;
      }
      const cosmeticId = CosmeticsIapSystem.BY_SKU.get(sku)?.grantsCosmetic;
      if (!cosmeticId) {
        this.host.say("Unknown cosmetic SKU");
        return;
      }
      this.host.pendingEntitlements.enqueue(sku, result.purchaseToken, cosmeticId);
      this.host.applyStoreOwned(
        [{ sku, purchaseToken: result.purchaseToken, grantsCosmetic: cosmeticId }],
        false,
      );
    });
  }

  restorePurchases(): void {
    void this.host.billing.restoreAll(this.host.cloudAccountId()).then((owned) => {
      if (owned.length === 0 && this.host.pendingEntitlements.all().length === 0) {
        this.host.say("No purchases to restore");
        return;
      }
      for (const row of owned) {
        this.host.pendingEntitlements.enqueue(row.sku, row.purchaseToken, row.grantsCosmetic);
      }
      this.host.applyStoreOwned(owned, true);
    });
  }
}
