import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GameState,
  MasterySystem,
  Simulation,
  StepContext,
  buildView,
  loadContent,
} from "../src/engine";
import {
  FISHING_MASTERY,
  FISHING_MASTERY_PHASE,
  MASTERY_COACHING_TIP_FLOOR,
  MASTERY_TECHNIQUE_FLOOR,
} from "../src/ship/fishingMastery";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Fishing mastery (Finish 2.0 Phase 14)", () => {
  it("locks catalog floors", () => {
    expect(FISHING_MASTERY_PHASE).toBe(14);
    expect(MASTERY_TECHNIQUE_FLOOR).toBe(3);
    expect(MASTERY_COACHING_TIP_FLOOR).toBe(5);
    expect(content.fishingMastery.techniques.length).toBeGreaterThanOrEqual(3);
    expect(content.fishingMastery.coachingTips.length).toBeGreaterThanOrEqual(5);
    expect((storeListing as { fishingMasteryPhase?: number }).fishingMasteryPhase).toBe(14);
    for (const id of FISHING_MASTERY.techniques) {
      expect(content.techniquesById.has(id)).toBe(true);
    }
  });

  it("grants XP, unlocks techniques, exposes SimView", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-fishing-mastery.json"), "utf8"),
    );
    const sim = new Simulation(content, GameState.newGame(content, fx.harborId, fx.seed));
    const speciesId = fx.catchSpeciesId as string;
    const ctx = new StepContext(content, sim.state);
    MasterySystem.grantCatchXp(ctx, speciesId, "perfect", false);
    expect(MasterySystem.xpOf(sim.state, speciesId)).toBeGreaterThanOrEqual(fx.expectAfterCatch.minXp);
    expect(MasterySystem.levelOf(content, sim.state, speciesId)).toBeGreaterThanOrEqual(
      fx.expectAfterCatch.minLevel,
    );
    expect(MasterySystem.technique(content, sim.state).id).toBe(fx.expectAfterCatch.techniqueId);
    expect(ctx.events.some((e) => e.type === "mastery_xp_gained")).toBe(true);

    sim.state.speciesMasteryXp.set(speciesId, fx.expectAfterLevel2Xp.xp);
    sim.state.speciesCatches.set(speciesId, 1);
    expect(MasterySystem.levelOf(content, sim.state, speciesId)).toBe(fx.expectAfterLevel2Xp.level);
    const power = content.techniquesById.get(fx.expectAfterLevel2Xp.unlockedTechniqueId)!;
    expect(MasterySystem.isUnlocked(content, sim.state, power)).toBe(true);

    sim.step([{ type: "select_technique", techniqueId: power.id }]);
    expect(MasterySystem.technique(content, sim.state).id).toBe(power.id);
    expect(MasterySystem.catchSpeedMultPermille(content, sim.state, speciesId)).toBeGreaterThan(1000);

    const view = buildView(sim);
    expect(view.activeTechniqueId).toBe(power.id);
    expect(view.techniques.some((t) => t.id === power.id && t.unlocked && t.active)).toBe(true);
    const entry = view.speciesBook.entries.find((e) => e.speciesId === speciesId);
    expect(entry?.masteryXp).toBe(fx.expectAfterLevel2Xp.xp);
    expect(entry?.masteryLevel).toBe(fx.expectAfterLevel2Xp.level);
  });

  it("mastery:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-fishing-mastery.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK mastery:validate");
  }, 60_000);
});
