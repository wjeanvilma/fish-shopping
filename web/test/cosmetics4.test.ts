import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CosmeticsIapSystem,
  DecorSystem,
  GameState,
  SCHEMA_VERSION,
  Simulation,
  loadContent,
} from "../src/engine";
import { iapCatalogMatchesPresentation } from "../src/engine/cosmeticPresentation";
import {
  COSMETICS_4_MARKER,
  COSMETICS_4_PHASE,
  measureCosmetics4,
} from "../src/ship/cosmetics4";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Cosmetics/IAP 12→18 (Finish 4.0 Phase 18)", () => {
  it("locks phase 18 catalog floors", () => {
    expect(COSMETICS_4_PHASE).toBe(18);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(COSMETICS_4_MARKER).toBe("authored-finish-4.0-phase-18");
    expect((storeListing as { cosmetics4Phase?: number }).cosmetics4Phase).toBe(18);
    expect(CosmeticsIapSystem.CATALOG.length).toBeGreaterThanOrEqual(18);
  });

  it("measures cosmetics deepen wiring", () => {
    const m = measureCosmetics4(root);
    expect(m.cosmeticCount).toBeGreaterThanOrEqual(18);
    expect(m.newCosmeticsPresent).toBe(true);
    expect(m.engineParity).toBe(true);
    expect(m.presentationParity).toBe(true);
    expect(m.powerNeutral).toBe(true);
    expect(m.kickoffFloorsMet).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
    expect(iapCatalogMatchesPresentation()).toBe(true);
  });

  it("grants new mist_bunting without changing rates or patience", () => {
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 1818));
    const sku = CosmeticsIapSystem.BY_SKU.get("fish.cosmetic.mist_bunting")!;
    expect(sku).toBeTruthy();
    const beforeCoins = sim.state.coins;
    const beforePatience = DecorSystem.patienceBonusTicks(content, sim.state);
    const req = CosmeticsIapSystem.requestIdForPurchaseToken(sku.sku, "tok-mist");
    const events = sim.step([
      { type: "grant_iap_cosmetic", cosmeticId: sku.grantsCosmetic, requestId: req },
    ]);
    expect(sim.state.unlockedCosmetics.has(sku.grantsCosmetic)).toBe(true);
    expect(events.some((e) => e.type === "iap_cosmetic_granted" && !e.replayed)).toBe(true);
    expect(sim.state.coins).toBe(beforeCoins);
    expect(DecorSystem.patienceBonusTicks(content, sim.state)).toBe(beforePatience);
    expect(content.decor.items.some((d) => d.requiresCosmetic === sku.grantsCosmetic)).toBe(false);
  });

  it("cosmetics4:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-cosmetics-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK cosmetics4:validate");
  });
});
