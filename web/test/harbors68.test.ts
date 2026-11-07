import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Command,
  GameState,
  Simulation,
  Stats,
  buildView,
  loadContent,
} from "../src/engine";
import {
  HARBORS_68,
  HARBORS_68_PHASE,
  HARBORS_68_SCHEMA,
  HARBOR_COUNT_FLOOR,
} from "../src/ship/harbors68";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function checkedStep(sim: Simulation, cmds: Command[] = []) {
  const events = sim.step(cmds);
  const problems = sim.invariantProblems();
  if (problems.length) throw new Error(problems.join("; "));
  return events;
}

describe("Harbors 6–8 (Finish 2.0 Phase 8)", () => {
  it("locks catalog and eight-harbor content floor", () => {
    expect(HARBORS_68_PHASE).toBe(8);
    expect(HARBORS_68_SCHEMA).toBe("fish.ship.harbors_6_8.v1");
    expect(HARBOR_COUNT_FLOOR).toBe(8);
    expect(content.harbors).toHaveLength(8);
    expect((storeListing as { harbors68Phase?: number }).harbors68Phase).toBe(8);
    for (const entry of HARBORS_68.newHarbors) {
      expect(content.harborsById.has(entry.id)).toBe(true);
      expect(content.harborsById.get(entry.id)!.specialization!.id).toBe(entry.specialization);
    }
  });

  it("travels coral → storm → ember and unlocks six/seven/eight prestige", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-harbors-6-8.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    for (const q of fx.setup.completedQuests) sim.state.completedQuests.add(q);
    for (const p of fx.setup.completedPrestige) sim.state.completedPrestige.add(p);
    for (const c of fx.setup.unlockedCosmetics) sim.state.unlockedCosmetics.add(c);
    sim.state.stats.set(Stats.HARBORS_TRAVELED, fx.setup.harborsTraveled);

    for (const step of fx.travels) {
      expect(buildView(sim).harbors.find((h) => h.harborId === step.harborId)!.travelEnabled).toBe(true);
      const events = checkedStep(sim, [
        { type: "travel_to_harbor", harborId: step.harborId, requestId: step.requestId },
      ]);
      expect(
        events.some((e) => e.type === "harbor_traveled" && !e.replayed && e.toHarborId === step.harborId),
      ).toBe(true);
      expect(sim.state.harborId).toBe(step.harborId);
      expect(buildView(sim).blockoutAsset).toBe(step.expectBlockout);
      checkedStep(sim);
      checkedStep(sim);
      expect(sim.state.completedQuests.has(step.expectQuest)).toBe(true);
      expect(sim.state.completedPrestige.has(step.expectPrestige)).toBe(true);
      expect(sim.state.unlockedCosmetics.has(step.expectBanner)).toBe(true);
    }

    expect(sim.state.harborId).toBe(fx.expectFinal.harborId);
    expect(sim.state.stat(Stats.HARBORS_TRAVELED)).toBe(fx.expectFinal.harborsTraveled);
    expect(buildView(sim).blockoutAsset).toBe(fx.expectFinal.blockoutAsset);
    expect(content.harborsById.get(sim.state.harborId)!.specialization!.id).toBe(
      fx.expectFinal.specializationId,
    );
  });

  it("harbors68:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbors-6-8.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harbors68:validate");
  }, 60_000);
});
