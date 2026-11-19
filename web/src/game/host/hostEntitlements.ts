/**
 * Finish 6.0 Phase 5 — GameHost store entitlement reconcile helpers.
 */
import type { RestoredEntitlement } from "../../billing/entitlementBilling";
import { isProductionWebBilling } from "../../billing/entitlementBilling";
import {
  mergeStoreAndPending,
  neededGrants,
  snapshotOf as entitlementSnapshotOf,
  type StoreOwned,
} from "../../billing/entitlementReconcile";
import type { GameHost } from "../GameHost";

export class HostEntitlements {
  constructor(private readonly host: GameHost) {}

/**
 * Phase 2 (post-1.0): after hosted checkout redirect (`?billing=success&session_id=`),
 * fulfill entitlements and strip the query so refresh does not re-fulfill.
 */
async consumeBillingReturnQuery(): Promise<void> {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const billing = params.get("billing");
  if (billing === "cancel") {
    this.host.say("Checkout canceled");
    this.stripBillingQuery();
    return;
  }
  if (billing !== "success") return;
  const sessionId = params.get("session_id") ?? params.get("sessionId");
  if (!sessionId) {
    this.stripBillingQuery();
    return;
  }
  if (!isProductionWebBilling(this.host.billing)) {
    this.stripBillingQuery();
    return;
  }
  try {
    const owned = await this.host.billing.completeCheckoutReturn(sessionId, this.host.settings.cloudAccountId);
    for (const row of owned) {
      this.host.pendingEntitlements.enqueue(row.sku, row.purchaseToken, row.grantsCosmetic);
    }
    // Title boot has no sim yet — ledger keeps grants until continue/newGame reconcile.
    if (owned.length > 0 && this.host.sim) {
      this.applyStoreOwned(owned, true);
    } else if (owned.length > 0) {
      this.host.say(`Purchase saved — continue to apply ${owned.length}`);
    }
  } catch (err) {
    this.host.say(err instanceof Error ? err.message : "Checkout fulfill failed");
  } finally {
    this.stripBillingQuery();
  }
}


stripBillingQuery(): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.delete("billing");
  url.searchParams.delete("session_id");
  url.searchParams.delete("sessionId");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

/**
 * Phase 3: store is SoT for paid SKUs — merge restore + pending ledger into the live save,
 * apply only missing flags/receipts, checkpoint, then ack the ledger.
 */
async reconcileEntitlementsFromStore(): Promise<void> {
  const owned = await this.host.billing.restoreAll(this.host.settings.cloudAccountId).catch(() => [] as RestoredEntitlement[]);
  this.applyStoreOwned(owned, false);
}


applyStoreOwned(owned: RestoredEntitlement[], announceRestore: boolean): void {
  const sim = this.host.sim;
  if (!sim) return;
  const storeRows: StoreOwned[] = owned.map((row) => ({
    sku: row.sku,
    purchaseToken: row.purchaseToken,
    grantsCosmetic: row.grantsCosmetic,
  }));
  const merged = mergeStoreAndPending(storeRows, this.host.pendingEntitlements.all());
  const needs = neededGrants(merged, entitlementSnapshotOf(sim.state));
  if (needs.length === 0) {
    this.host.pendingEntitlements.ackRequestIds(new Set(sim.state.purchaseReceipts.keys()));
    if (announceRestore) {
      const n = merged.length;
      this.host.say(n === 0 ? "No purchases to restore" : `Restored ${n} purchase${n === 1 ? "" : "s"}`);
    }
    return;
  }
  for (const need of needs) {
    this.host.pendingEntitlements.enqueue(need.sku, need.purchaseToken, need.cosmeticId);
    if (need.cosmeticId) {
      this.host.commands.push({
        type: "grant_iap_cosmetic",
        cosmeticId: need.cosmeticId,
        requestId: need.requestId,
      });
    } else {
      this.host.commands.push({
        type: "grant_full_harbor_unlock",
        requestId: need.requestId,
      });
    }
  }
  this.host.step(sim);
  this.host.publish(true);
  this.host.save();
  this.host.pendingEntitlements.ackRequestIds(new Set(sim.state.purchaseReceipts.keys()));
  if (announceRestore) {
    this.host.say(`Restored ${merged.length} purchase${merged.length === 1 ? "" : "s"}`);
  } else if (needs.some((n) => !n.cosmeticId && n.reason.includes("flag")) && sim.state.fullHarborUnlock) {
    this.host.say("Harbor unlock restored");
  }
}

}
