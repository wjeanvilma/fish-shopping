import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  encodeSnapshot,
  decodeSnapshot,
  FullUnlockSystem,
  GameState,
  HarborTravelSystem,
  loadContent,
  Simulation,
  SCHEMA_VERSION,
} from "../src/engine";
import {
  FREE_HARBOR_ID,
  FULL_UNLOCK_SKU,
  grantRequestId,
  MemoryEntitlementBilling,
} from "../src/billing/entitlementBilling";

const content = loadContent(
  JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")),
);

function newSim(seed = 1) {
  return new Simulation(content, GameState.newGame(content, FREE_HARBOR_ID, seed));
}

describe("fullUnlock (Phase 23)", () => {
  it("documents free Sunrise Pier and power-neutral full unlock SKU", () => {
    const catalog = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/billing/entitlements.json"), "utf8"),
    );
    expect(catalog.freeHarborId).toBe(FREE_HARBOR_ID);
    expect(catalog.fullUnlock.sku).toBe(FULL_UNLOCK_SKU);
    expect(catalog.fullUnlock.webProductId).toBe(FullUnlockSystem.WEB_PRODUCT_ID);
    expect(catalog.fullUnlock.androidProductId).toBe(FullUnlockSystem.ANDROID_PRODUCT_ID);
    expect(catalog.fullUnlock.powerNeutral).toBe(true);
    expect(content.harborsById.get(FREE_HARBOR_ID)!.requires).toEqual([]);
    expect(FullUnlockSystem.FREE_HARBOR_ID).toBe(FREE_HARBOR_ID);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(21);
  });

  it("grants idempotently and unlocks every harbor without changing rates", () => {
    const sim = newSim();
    const moon = content.harborsById.get("harbor.moon_cove")!;
    expect(HarborTravelSystem.unlocked(content, sim.state, moon)).toBe(false);

    const token = "tok-abc";
    const req = FullUnlockSystem.requestIdForPurchaseToken(token);
    const first = sim.step([{ type: "grant_full_harbor_unlock", requestId: req }]);
    expect(sim.state.fullHarborUnlock).toBe(true);
    expect(first.some((e) => e.type === "full_harbor_unlock_granted" && !e.replayed)).toBe(true);
    expect(HarborTravelSystem.unlocked(content, sim.state, moon)).toBe(true);
    for (const h of content.harbors) {
      expect(HarborTravelSystem.unlocked(content, sim.state, h)).toBe(true);
    }

    const beforeCoins = sim.state.coins;
    const beforeCatch = sim.state.prestigeCatchSpeedPermille;
    const beforePrice = sim.state.prestigePriceBonusPermille;
    const retry = sim.step([{ type: "grant_full_harbor_unlock", requestId: req }]);
    expect(retry.some((e) => e.type === "full_harbor_unlock_granted" && e.replayed)).toBe(true);
    expect(sim.state.coins).toBe(beforeCoins);
    expect(sim.state.prestigeCatchSpeedPermille).toBe(beforeCatch);
    expect(sim.state.prestigePriceBonusPermille).toBe(beforePrice);
  });

  it("persists fullHarborUnlock across schema 20 snapshots", () => {
    const sim = newSim(3);
    sim.step([{ type: "grant_full_harbor_unlock", requestId: "full-unlock:persist" }]);
    const saved = encodeSnapshot(content, sim.state, 5_000);
    expect(saved.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
    const loaded = decodeSnapshot(content, saved);
    expect(loaded.fullHarborUnlock).toBe(true);
  });

  it("billing stub restores and associates guest cloud account", async () => {
    const billing = new MemoryEntitlementBilling();
    const buy = await billing.purchaseFullUnlock(null);
    expect(buy.ok).toBe(true);
    if (!buy.ok) return;
    expect(buy.alreadyOwned).toBe(false);

    const restore = await billing.restore("cloud-guest-1");
    expect(restore.owned).toBe(true);
    expect(restore.purchaseToken).toBe(buy.purchaseToken);

    const again = await billing.purchaseFullUnlock("cloud-guest-1");
    expect(again.ok && again.alreadyOwned).toBe(true);
    expect(grantRequestId(buy.purchaseToken)).toBe(`full-unlock:${buy.purchaseToken}`);
  });
});
