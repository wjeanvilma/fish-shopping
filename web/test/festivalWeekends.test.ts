import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  CustomerSystem,
  GameState,
  SeasonalEventSystem,
  Simulation,
  buildView,
  loadContent,
} from "../src/engine";
import {
  FESTIVAL_WEEKEND_FLOOR,
  FESTIVAL_WEEKENDS,
  FESTIVAL_WEEKENDS_PHASE,
} from "../src/ship/festivalWeekends";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("festival weekends (Finish 2.0 Phase 16)", () => {
  it("catalog floors and content", () => {
    expect(FESTIVAL_WEEKENDS_PHASE).toBe(16);
    expect(FESTIVAL_WEEKEND_FLOOR).toBe(8);
    expect(content.seasonalEvents.events.length).toBeGreaterThanOrEqual(8);
    expect((JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
      festivalWeekendsPhase?: number;
    }).festivalWeekendsPhase).toBe(16);
    for (const id of FESTIVAL_WEEKENDS.events) {
      expect(content.seasonalEventsById.has(id)).toBe(true);
    }
  });

  it("silver tide stacks crowd/price, gates festival customer, unlocks banner", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-festival-weekends.json"), "utf8"),
    );
    const event = content.seasonalEventsById.get(fx.eventId)!;
    expect(event.customerSpawnMultPermille).toBe(fx.expect.customerSpawnMultPermille);
    expect(event.priceMultPermille).toBe(fx.expect.priceMultPermille);
    expect(SeasonalEventSystem.scaledWeight(1000, content, fx.tickInWindow, "species.silver_sprat"))
      .toBe(fx.expect.speciesWeightSilverSprat);
    expect(SeasonalEventSystem.customerSpawnMultPermille(content, fx.tickInWindow))
      .toBe(event.customerSpawnMultPermille);
    expect(SeasonalEventSystem.priceMultPermille(content, fx.tickInWindow))
      .toBe(event.priceMultPermille);

    const harbor = content.harborsById.get(fx.harborId)!;
    const sim = new Simulation(content, GameState.newGame(content, harbor.id, fx.seed));
    const guest = content.customersById.get(fx.festivalCustomerId)!;
    sim.state.tick = fx.tickInWindow;
    expect(CustomerSystem.effectiveSpawnWeight(content, sim.state, harbor, guest)).toBeGreaterThanOrEqual(1);
    sim.state.tick = fx.tickInWindow - 1;
    expect(CustomerSystem.effectiveSpawnWeight(content, sim.state, harbor, guest)).toBe(0);

    // step() increments tick first — enter the window from tick-1.
    sim.state.tick = fx.tickInWindow - 1;
    sim.step([]);
    expect(sim.state.tick).toBe(fx.tickInWindow);
    const banner = buildView(sim).seasonalEvent;
    expect(banner?.eventId).toBe(fx.eventId);
    expect(banner?.customerSpawnMultPermille).toBe(event.customerSpawnMultPermille);
    expect(banner?.priceMultPermille).toBe(event.priceMultPermille);
    expect(sim.state.unlockedCosmetics.has(event.banner!)).toBe(true);
  });

  it("festivals:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-festival-weekends.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK festivals:validate");
  });
});
