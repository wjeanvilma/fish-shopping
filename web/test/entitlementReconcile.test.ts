import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  alreadySatisfiedCount,
  EntitlementReconcilePath,
  mergeStoreAndPending,
  neededGrants,
  requestIdFor,
  snapshotOf,
  type StoreOwned,
} from "../src/billing/entitlementReconcile";
import { PendingEntitlementLedger } from "../src/billing/pendingEntitlementLedger";
import {
  CosmeticsIapSystem,
  FullUnlockSystem,
  GameState,
  loadContent,
  Simulation,
} from "../src/engine";

const content = loadContent(
  JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")),
);

const memory = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => { memory.set(k, String(v)); },
  removeItem: (k) => { memory.delete(k); },
  clear: () => memory.clear(),
  key: (i) => [...memory.keys()][i] ?? null,
  get length() { return memory.size; },
};

describe("entitlementReconcile (post-1.0 Phase 3)", () => {
  it("catalog documents store SoT and crash ledger keys", () => {
    const json = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/billing/entitlement-reconcile.json"), "utf8"),
    );
    expect(json.phase).toBe(EntitlementReconcilePath.PHASE);
    expect(json.schema).toBe(EntitlementReconcilePath.SCHEMA);
    expect(json.sourceOfTruth.paidSkus).toBe("store");
    expect(json.crashSafety.pendingLedger).toBe(true);
    expect(json.crashSafety.webStorageKey).toBe(EntitlementReconcilePath.WEB_STORAGE_KEY);
    expect(json.cloudConflict.policy).toContain("reapply_store_owned");

    const entitlements = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/billing/entitlements.json"), "utf8"),
    );
    expect(entitlements.entitlementReconcilePhase).toBe(3);
  });

  it("neededGrants covers missing flag and missing receipt", () => {
    const store: StoreOwned[] = [
      { sku: FullUnlockSystem.SKU, purchaseToken: "tok-full", grantsCosmetic: null },
    ];
    const empty = { fullHarborUnlock: false, unlockedCosmetics: new Set<string>(), purchaseReceiptIds: new Set<string>() };
    expect(neededGrants(store, empty)[0]!.reason).toBe("missing_flag_and_receipt");

    const flagged = { ...empty, fullHarborUnlock: true };
    expect(neededGrants(store, flagged)[0]!.reason).toBe("missing_receipt");

    const complete = {
      ...flagged,
      purchaseReceiptIds: new Set([requestIdFor(store[0]!)]),
    };
    expect(neededGrants(store, complete)).toHaveLength(0);
    expect(alreadySatisfiedCount(store, complete)).toBe(1);
  });

  it("merge prefers store token and fills pending cosmetics", () => {
    const cosmetic = CosmeticsIapSystem.CATALOG[0]!;
    const merged = mergeStoreAndPending(
      [{ sku: FullUnlockSystem.SKU, purchaseToken: "store-tok", grantsCosmetic: null }],
      [
        { sku: FullUnlockSystem.SKU, purchaseToken: "pending-tok", grantsCosmetic: null },
        { sku: cosmetic.sku, purchaseToken: "cos-tok", grantsCosmetic: cosmetic.grantsCosmetic },
      ],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.sku === FullUnlockSystem.SKU)!.purchaseToken).toBe("store-tok");
  });

  it("pending ledger survives ack of satisfied request ids", () => {
    const key = EntitlementReconcilePath.WEB_STORAGE_KEY;
    localStorage.removeItem(key);
    const ledger = new PendingEntitlementLedger();
    ledger.enqueue(FullUnlockSystem.SKU, "tok-a", null);
    const cosmetic = CosmeticsIapSystem.CATALOG[0]!;
    ledger.enqueue(cosmetic.sku, "tok-b", cosmetic.grantsCosmetic);
    expect(ledger.all()).toHaveLength(2);

    const fullId = requestIdFor({
      sku: FullUnlockSystem.SKU,
      purchaseToken: "tok-a",
      grantsCosmetic: null,
    });
    ledger.ackRequestIds(new Set([fullId]));
    expect(ledger.all()).toHaveLength(1);
    expect(ledger.all()[0]!.sku).toBe(cosmetic.sku);
    ledger.clear();
    expect(ledger.all()).toHaveLength(0);
  });

  it("applying needed grants into a save is idempotent and keeps prestige cosmetics", () => {
    const sim = new Simulation(content, GameState.newGame(content, FullUnlockSystem.FREE_HARBOR_ID, 1));
    sim.state.unlockedCosmetics.add("banner.prestige_only");
    const sku = CosmeticsIapSystem.CATALOG[0]!;
    const store: StoreOwned[] = [
      { sku: FullUnlockSystem.SKU, purchaseToken: "t-full", grantsCosmetic: null },
      { sku: sku.sku, purchaseToken: "t-cos", grantsCosmetic: sku.grantsCosmetic },
    ];
    const needs = neededGrants(store, snapshotOf(sim.state));
    expect(needs).toHaveLength(2);
    for (const need of needs) {
      if (need.cosmeticId) {
        sim.step([{ type: "grant_iap_cosmetic", cosmeticId: need.cosmeticId, requestId: need.requestId }]);
      } else {
        sim.step([{ type: "grant_full_harbor_unlock", requestId: need.requestId }]);
      }
    }
    expect(sim.state.fullHarborUnlock).toBe(true);
    expect(sim.state.unlockedCosmetics.has(sku.grantsCosmetic)).toBe(true);
    expect(sim.state.unlockedCosmetics.has("banner.prestige_only")).toBe(true);
    expect(neededGrants(store, snapshotOf(sim.state))).toHaveLength(0);
  });
});
