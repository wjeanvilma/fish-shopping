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
  RIVAL_COUNT,
  RIVAL_MARKETS,
  RIVAL_MARKETS_MARKER,
  RIVAL_MARKETS_PHASE,
  measureRivalMarkets,
} from "../src/ship/rivalMarkets";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Rival markets (Finish 3.0 Phase 14)", () => {
  it("locks phase 14 catalog floors", () => {
    expect(RIVAL_MARKETS_PHASE).toBe(14);
    expect(RIVAL_COUNT).toBe(8);
    expect(RIVAL_MARKETS.rivalIds).toHaveLength(8);
    expect(RIVAL_MARKETS_MARKER).toBe("authored-finish-3.0-phase-14");
    expect((storeListing as { rivalMarketsPhase?: number }).rivalMarketsPhase).toBe(14);
  });

  it("measures 8 rivals + wiring", () => {
    const m = measureRivalMarkets(root);
    expect(m.rivalCount).toBeGreaterThanOrEqual(8);
    expect(m.rivalsPresent).toBe(true);
    expect(m.harborsCovered).toBe(true);
    expect(m.statsWiredTs).toBe(true);
    expect(m.statsWiredKt).toBe(true);
    expect(m.systemMarkersTs).toBe(true);
    expect(m.systemMarkersKt).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingRivals).toEqual([]);
  });

  it("pressures empty sunrise shelves then beats when stocked", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-rival-markets.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    // Rivals stay quiet until the scripted tutorial finishes.
    sim.state.tutorialIndex = content.tutorial.length;
    for (let i = 0; i < fx.setup.advanceTicks; i++) sim.step();
    const active = RivalMarketSystem.activeRivals(content, sim.state, sim.state.harborId);
    expect(active.some((r) => r.id === fx.expectActive.rivalId)).toBe(true);
    expect(RivalMarketSystem.isPressuring(content, sim.state, sim.state.harborId)).toBe(
      fx.expectActive.pressureWhenEmpty,
    );
    expect(buildView(sim).activeRivalIds).toContain(fx.expectActive.rivalId);
    expect(buildView(sim).rivalPressureActive).toBe(true);

    const counter = sim.state.counters.find((c) => c.counterId === fx.stockAndSell.counterId)!;
    counter.stock.add(fx.stockAndSell.productId, fx.stockAndSell.quantity);
    expect(RivalMarketSystem.isPressuring(content, sim.state, sim.state.harborId)).toBe(false);

    const ctx = new StepContext(content, sim.state);
    RivalMarketSystem.noteSaleOutcome(ctx, [
      { item: fx.stockAndSell.productId, quantity: 1 },
    ]);
    expect(sim.state.stat("stat.rival_beats")).toBeGreaterThanOrEqual(1);
    expect(sim.state.beatenRivalIds.has(fx.stockAndSell.expectBeatRivalId)).toBe(true);
    expect(ctx.events.some((e) => e.type === "rival_beaten")).toBe(true);
  });

  it("rivalmarkets:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-rival-markets.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK rivalmarkets:validate");
  }, 90_000);
});
