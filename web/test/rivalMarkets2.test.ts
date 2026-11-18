import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GameState,
  Simulation,
  loadContent,
  RivalMarketSystem,
  StepContext,
  buildView,
} from "../src/engine";
import {
  RIVAL_COUNT_2,
  RIVAL_MARKETS_2,
  RIVAL_MARKETS_2_MARKER,
  RIVAL_MARKETS_2_PHASE,
  measureRivalMarkets2,
} from "../src/ship/rivalMarkets2";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Rival markets 2 (Finish 4.0 Phase 15)", () => {
  it("locks phase 15 catalog floors", () => {
    expect(RIVAL_MARKETS_2_PHASE).toBe(15);
    expect(RIVAL_COUNT_2).toBe(12);
    expect(RIVAL_MARKETS_2.newRivalIds).toHaveLength(4);
    expect(RIVAL_MARKETS_2_MARKER).toBe("authored-finish-4.0-phase-15");
    expect((storeListing as { rivalMarkets2Phase?: number }).rivalMarkets2Phase).toBe(15);
  });

  it("measures 12 rivals + AI depth wiring", () => {
    const m = measureRivalMarkets2(root);
    expect(m.rivalCount).toBeGreaterThanOrEqual(12);
    expect(m.newRivalsPresent).toBe(true);
    expect(m.harborsCovered).toBe(true);
    expect(m.aiProfilesPresent).toBe(true);
    expect(m.aiCatalogWired).toBe(true);
    expect(m.systemAiDepthTs).toBe(true);
    expect(m.systemAiDepthKt).toBe(true);
    expect(m.kickoffRivalsMet).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingNewRivals).toEqual([]);
  });

  it("mist multi-rival pressure then beats mist monger", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-rival-markets-2.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    sim.state.tutorialIndex = content.tutorial.length;
    for (const q of fx.setup.completedQuests ?? []) sim.state.completedQuests.add(q);
    for (let i = 0; i < fx.setup.advanceTicks; i++) sim.step();

    const active = RivalMarketSystem.activeRivals(content, sim.state, sim.state.harborId);
    for (const id of fx.expectActive.rivalIds) {
      expect(active.some((r) => r.id === id)).toBe(true);
    }
    expect(RivalMarketSystem.isPressuring(content, sim.state, sim.state.harborId)).toBe(
      fx.expectActive.pressureWhenEmpty,
    );
    const pressuring = RivalMarketSystem.pressuringRivals(content, sim.state, sim.state.harborId);
    expect(pressuring.length).toBeGreaterThanOrEqual(2);
    const spawnMult = RivalMarketSystem.customerSpawnMultPermille(
      content,
      sim.state,
      sim.state.harborId,
    );
    expect(spawnMult).toBeLessThan(content.rivalMarkets.pressureSpawnMultPermille);
    expect(buildView(sim).rivalPressureActive).toBe(true);

    const counter = sim.state.counters.find((c) => c.counterId === fx.stockAndSell.counterId)!;
    counter.stock.add(fx.stockAndSell.productId, fx.stockAndSell.quantity);
    const ctx = new StepContext(content, sim.state);
    RivalMarketSystem.noteSaleOutcome(ctx, [
      { item: fx.stockAndSell.productId, quantity: 1 },
    ]);
    expect(sim.state.stat("stat.rival_beats")).toBeGreaterThanOrEqual(1);
    expect(sim.state.beatenRivalIds.has(fx.stockAndSell.expectBeatRivalId)).toBe(true);
  });

  it("rivals2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-rival-markets-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK rivals2:validate");
  }, 90_000);
});
