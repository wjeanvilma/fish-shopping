import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildView,
  CosmeticsIapSystem,
  DecorSystem,
  GameState,
  loadContent,
  Simulation,
} from "../src/engine";
import {
  COSMETIC_CATALOG,
  MemoryEntitlementBilling,
  cosmeticGrantRequestId,
} from "../src/billing/entitlementBilling";

const content = loadContent(
  JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")),
);

function newSim(seed = 1) {
  return new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", seed));
}

describe("cosmeticsIap (Phase 24)", () => {
  it("documents power-neutral cosmetic SKUs that never gate patience decor", () => {
    const catalog = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/billing/entitlements.json"), "utf8"),
    );
    expect(catalog.cosmetics).toHaveLength(CosmeticsIapSystem.CATALOG.length);
    expect(COSMETIC_CATALOG).toHaveLength(CosmeticsIapSystem.CATALOG.length);
    for (const row of catalog.cosmetics) {
      expect(row.powerNeutral).toBe(true);
      expect(CosmeticsIapSystem.GRANTED_COSMETICS.has(row.grantsCosmetic)).toBe(true);
      const engine = CosmeticsIapSystem.BY_SKU.get(row.sku)!;
      expect(engine.webProductId).toBe(row.webProductId);
      expect(engine.androidProductId).toBe(row.androidProductId);
      expect(content.decor.items.some((d) => d.requiresCosmetic === row.grantsCosmetic)).toBe(false);
    }
  });

  it("grants idempotently without changing rates or patience", () => {
    const sim = newSim();
    const sku = CosmeticsIapSystem.CATALOG[0]!;
    const beforeCoins = sim.state.coins;
    const beforeCatch = sim.state.prestigeCatchSpeedPermille;
    const beforePrice = sim.state.prestigePriceBonusPermille;
    const beforePatience = DecorSystem.patienceBonusTicks(content, sim.state);

    const req = CosmeticsIapSystem.requestIdForPurchaseToken(sku.sku, "tok-cosmetic");
    const first = sim.step([{ type: "grant_iap_cosmetic", cosmeticId: sku.grantsCosmetic, requestId: req }]);
    expect(sim.state.unlockedCosmetics.has(sku.grantsCosmetic)).toBe(true);
    expect(first.some((e) => e.type === "iap_cosmetic_granted" && !e.replayed)).toBe(true);
    expect(sim.state.coins).toBe(beforeCoins);
    expect(sim.state.prestigeCatchSpeedPermille).toBe(beforeCatch);
    expect(sim.state.prestigePriceBonusPermille).toBe(beforePrice);
    expect(DecorSystem.patienceBonusTicks(content, sim.state)).toBe(beforePatience);

    const retry = sim.step([{ type: "grant_iap_cosmetic", cosmeticId: sku.grantsCosmetic, requestId: req }]);
    expect(retry.some((e) => e.type === "iap_cosmetic_granted" && e.replayed)).toBe(true);
    expect(sim.state.coins).toBe(beforeCoins);
    expect(DecorSystem.patienceBonusTicks(content, sim.state)).toBe(beforePatience);
  });

  it("rejects unknown cosmetics", () => {
    const sim = newSim(2);
    const events = sim.step([
      { type: "grant_iap_cosmetic", cosmeticId: "banner.not_real", requestId: "iap-cosmetic:x:tok" },
    ]);
    expect(events.some((e) => e.type === "iap_cosmetic_rejected")).toBe(true);
    expect(sim.state.unlockedCosmetics.has("banner.not_real")).toBe(false);
  });

  it("billing stub purchases and restores cosmetics with full unlock", async () => {
    const billing = new MemoryEntitlementBilling();
    const sku = CosmeticsIapSystem.CATALOG[0]!.sku;
    const buy = await billing.purchaseCosmetic(sku, null);
    expect(buy.ok).toBe(true);
    if (!buy.ok) return;
    expect(buy.alreadyOwned).toBe(false);
    expect(billing.ownedCosmetic(sku)).toBe(true);

    const unlock = await billing.purchaseFullUnlock("cloud-guest-1");
    expect(unlock.ok).toBe(true);

    const restored = await billing.restoreAll("cloud-guest-1");
    expect(restored.length).toBeGreaterThanOrEqual(2);
    expect(restored.some((r) => r.sku === sku && r.grantsCosmetic)).toBe(true);
    expect(restored.some((r) => r.grantsCosmetic === null)).toBe(true);
    expect(cosmeticGrantRequestId(sku, buy.purchaseToken)).toBe(`iap-cosmetic:${sku}:${buy.purchaseToken}`);
  });

  it("view lists cosmetic IAP offers and marks owned", () => {
    const sim = newSim(4);
    expect(buildView(sim).cosmeticIapOffers).toHaveLength(CosmeticsIapSystem.CATALOG.length);
    expect(buildView(sim).cosmeticIapOffers.every((o) => o.status === "available")).toBe(true);
    const sku = CosmeticsIapSystem.CATALOG[1]!;
    sim.step([{
      type: "grant_iap_cosmetic",
      cosmeticId: sku.grantsCosmetic,
      requestId: CosmeticsIapSystem.requestIdForPurchaseToken(sku.sku, "owned"),
    }]);
    const row = buildView(sim).cosmeticIapOffers.find((o) => o.sku === sku.sku)!;
    expect(row.status).toBe("owned");
  });
});
