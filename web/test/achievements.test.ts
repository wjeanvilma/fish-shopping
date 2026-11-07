import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GameState,
  Simulation,
  Stats,
  buildView,
  loadContent,
} from "../src/engine";
import {
  ACHIEVEMENT_COUNT_FLOOR,
  ACHIEVEMENTS_SHIP,
  ACHIEVEMENTS_SHIP_PHASE,
  ACHIEVEMENTS_SHIP_SCHEMA,
} from "../src/ship/achievements";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function checkedStep(sim: Simulation) {
  const events = sim.step();
  const problems = sim.invariantProblems();
  if (problems.length) throw new Error(problems.join("; "));
  return events;
}

describe("Achievements engine (Finish 2.0 Phase 11)", () => {
  it("locks catalog and fourteen-achievement floor", () => {
    expect(ACHIEVEMENTS_SHIP_PHASE).toBe(11);
    expect(ACHIEVEMENTS_SHIP_SCHEMA).toBe("fish.ship.achievements.v1");
    expect(ACHIEVEMENT_COUNT_FLOOR).toBe(14);
    expect(content.achievements.entries).toHaveLength(14);
    expect((storeListing as { achievementsPhase?: number }).achievementsPhase).toBe(11);
    for (const entry of ACHIEVEMENTS_SHIP.entries) {
      expect(content.achievementsById.has(entry.id)).toBe(true);
      const a = content.achievementsById.get(entry.id)!;
      expect(a.goal.stat).toBe(entry.goalStat);
      expect(a.goal.atLeast).toBe(entry.goalAtLeast);
      expect(a.rewardCoins).toBe(entry.rewardCoins);
    }
  });

  it("grants first catch + first sale with coins and SimView progress", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-achievements.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    for (const [stat, value] of Object.entries(fx.setup.stats as Record<string, number>)) {
      sim.state.stats.set(stat, value);
    }
    const before = sim.state.coins;
    const events = checkedStep(sim);
    for (const id of fx.expect.unlocked as string[]) {
      expect(sim.state.unlockedAchievements.has(id)).toBe(true);
      expect(events.some((e) => e.type === "achievement_unlocked" && e.achievementId === id)).toBe(true);
    }
    expect(sim.state.coins).toBe(before + fx.expect.coinsRewarded);
    expect(sim.state.stat(Stats.ACHIEVEMENTS_UNLOCKED)).toBe(fx.expect.achievementsUnlockedStat);
    const view = buildView(sim);
    expect(view.unlockedAchievementsCount).toBe(fx.expect.unlocked.length);
    expect(view.achievements).toHaveLength(fx.expect.achievementCount);
    expect(view.achievements.find((a) => a.id === "achievement.first_catch")!.status).toBe("unlocked");
    expect(view.achievements.find((a) => a.id === "achievement.pier_regular")!.status).toBe("active");
    expect(view.achievements.find((a) => a.id === "achievement.pier_regular")!.progress).toBe(1);

    // Idempotent: second step does not re-grant.
    const coinsAfter = sim.state.coins;
    checkedStep(sim);
    expect(sim.state.coins).toBe(coinsAfter);
    expect(sim.state.stat(Stats.ACHIEVEMENTS_UNLOCKED)).toBe(fx.expect.achievementsUnlockedStat);
  });

  it("achievements:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-achievements.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK achievements:validate");
  }, 60_000);
});
