import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EconomySystem,
  GameState,
  SCHEMA_VERSION,
  Simulation,
  buildView,
  loadContent,
} from "../src/engine";
import { CastPhases } from "../src/engine/systems/castPhases";
import {
  ENGINE_DEPTH_1_MARKER,
  ENGINE_DEPTH_1_PHASE,
  measureEngineDepth1,
} from "../src/ship/engineDepth1";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function newSim(seed = 42): Simulation {
  return new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", seed));
}

function walkTo(sim: Simulation, x: number, z: number): void {
  for (let i = 0; i < 400; i++) {
    const dx = Math.sign(x - sim.state.player.x);
    const dz = Math.sign(z - sim.state.player.z);
    if (dx === 0 && dz === 0) break;
    sim.step([{ type: "move", dx, dz }]);
  }
  sim.state.player.x = x;
  sim.state.player.z = z;
  sim.step([{ type: "move", dx: 0, dz: 0 }]);
}

describe("Engine depth 1 (Finish 5.0 Phase 2)", () => {
  it("locks phase 2 catalog floors", () => {
    expect(ENGINE_DEPTH_1_PHASE).toBe(2);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(ENGINE_DEPTH_1_MARKER).toBe("authored-finish-5.0-phase-2");
    expect((storeListing as { engineDepth1Phase?: number }).engineDepth1Phase).toBe(2);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("engineDepthIncomplete");
  });

  it("measures cast/spoil wiring", () => {
    const m = measureEngineDepth1(root);
    expect(m.castPhaseCount).toBeGreaterThanOrEqual(3);
    expect(m.castPhasesPresent).toBe(true);
    expect(m.statsPresent).toBe(true);
    expect(m.eventsPresent).toBe(true);
    expect(m.viewFieldsPresent).toBe(true);
    expect(m.strikeXpMatches).toBe(true);
    expect(m.castBandMatches).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("emits cast phase events and strike reel stats", () => {
    const sim = newSim(7);
    walkTo(sim, -14250, 0);
    expect(sim.state.player.zoneId).toBe("zone.pier_end");
    const spot = sim.state.fishingSpots.find((s) => s.zoneId === "zone.pier_end")!;
    spot.stock = Math.max(spot.stock, 3);

    for (let i = 0; i < 5; i++) sim.step([]);
    expect(sim.state.player.fishingSpecies).not.toBeNull();
    expect(sim.state.player.lastCastPhase).toBe("waiting");
    expect(sim.state.stat("stat.cast_phase_transitions")).toBeGreaterThanOrEqual(1);

    const duration = sim.state.player.fishingCatchTicks;
    const strikeStart = Math.ceil((CastPhases.WAITING_END_PERMILLE * duration) / 1000);
    while (sim.state.player.fishingProgress < strikeStart && sim.state.player.fishingSpecies) {
      sim.step([]);
    }
    expect(sim.state.player.lastCastPhase).toBe("strike");
    expect(buildView(sim).castPhase).toBe("strike");

    const beforeStrike = sim.state.stat("stat.cast_strike_reels");
    let struck = false;
    for (let i = 0; i < 200 && sim.state.player.fishingSpecies; i++) {
      const phase = CastPhases.phaseAt(
        sim.state.player.fishingProgress,
        sim.state.player.fishingCatchTicks,
        content,
        sim.state,
      );
      if (phase !== "strike") break;
      const tier = buildView(sim).fishingTimingTier;
      if (tier) {
        const strikeEvents = sim.step([{ type: "reel" }]);
        expect(strikeEvents.some((e) => e.type === "cast_strike_reel")).toBe(true);
        expect(sim.state.stat("stat.cast_strike_reels")).toBe(beforeStrike + 1);
        struck = true;
        break;
      }
      sim.step([]);
    }
    if (!struck) {
      expect(
        sim.state.player.lastCastPhase === "fight" ||
          sim.state.stat("stat.cast_phase_transitions") >= 2,
      ).toBe(true);
    }
  });

  it("exposes spoil ETA and pressure on the view", () => {
    const sim = newSim();
    sim.state.completedQuests.add("quest.first_ten_sales");
    const locked = buildView(sim);
    expect(locked.ticksUntilBagSpoil).toBeNull();
    expect(locked.bagSpoilPressurePermille).toBe(1000);

    const sprat = [...content.speciesById.keys()][0]!;
    sim.state.player.bag.capacityUnits = 10;
    sim.state.player.bag.add(sprat, 2);
    const v = buildView(sim);
    expect(v.bagFishSpoilActive).toBe(true);
    expect(v.ticksUntilBagSpoil).toBe(
      EconomySystem.bagFishSpoilPeriodTicks(content, sim.state) - sim.state.bagSpoilAccrualTicks,
    );
    expect(v.bagSpoilPressurePermille).toBeGreaterThanOrEqual(750);
    expect(v.castPhase).toBeNull();
  });

  it("enginedepth1:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-engine-depth-1.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK enginedepth1:validate");
  });
});
