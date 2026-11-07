import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DailyGoalsSystem,
  GameState,
  Simulation,
  Stats,
  buildView,
  loadContent,
} from "../src/engine";
import {
  DAILY_GOALS_PHASE,
  DAILY_OBJECTIVE_FLOOR,
  OFFLINE_JOURNAL_DAILY_GOALS,
} from "../src/ship/offlineJournalDailyGoals";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("offline journal + daily goals (Finish 2.0 Phase 18)", () => {
  it("locks catalog floors", () => {
    expect(DAILY_GOALS_PHASE).toBe(18);
    expect(DAILY_OBJECTIVE_FLOOR).toBe(6);
    expect(content.dailyGoals.objectives.length).toBeGreaterThanOrEqual(6);
    expect((JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
      offlineJournalDailyGoalsPhase?: number;
    }).offlineJournalDailyGoalsPhase).toBe(18);
    for (const id of OFFLINE_JOURNAL_DAILY_GOALS.objectives) {
      expect(content.dailyObjectivesById.has(id)).toBe(true);
    }
  });

  it("syncs clock, claims daily, builds journal lines", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-offline-journal-daily-goals.json"), "utf8"),
    );
    const sim = new Simulation(content, GameState.newGame(content, fx.harborId, fx.seed));
    sim.step([{ type: "sync_wall_clock", epochMs: fx.epochMs }]);
    expect(DailyGoalsSystem.currentDayId(content, sim.state)).toBe(fx.expect.dayId);
    expect(DailyGoalsSystem.streak(sim.state)).toBe(fx.expect.streakAfterSync);

    const objective = content.dailyObjectivesById.get(fx.objectiveId)!;
    const idx = content.dailyGoals.objectives.findIndex((o) => o.id === fx.objectiveId);
    sim.state.stats.set(DailyGoalsSystem.boardSlotKey(0), idx + 1);
    for (let i = 1; i < content.dailyGoals.boardSlots; i++) {
      sim.state.stats.delete(DailyGoalsSystem.boardSlotKey(i));
    }
    const baseline = DailyGoalsSystem.progress(content, sim.state, objective);
    sim.state.stats.set(
      Stats.FISH_CAUGHT,
      sim.state.stat(Stats.FISH_CAUGHT) + (objective.goal.atLeast - baseline),
    );
    expect(DailyGoalsSystem.isComplete(content, sim.state, objective)).toBe(true);

    sim.step([{ type: "claim_daily_goal", objectiveId: fx.objectiveId, requestId: "claim-daily-1" }]);
    expect(DailyGoalsSystem.isClaimed(content, sim.state, objective)).toBe(true);
    const view = buildView(sim);
    expect(view.dailyLoginStreak).toBe(1);
    expect(view.dailyGoals.some((g) => g.objectiveId === fx.objectiveId && g.claimed)).toBe(true);

    const lines = DailyGoalsSystem.journalLines(content, sim.state, {
      elapsedMillis: 60_000,
      ticksCredited: 100,
      capped: false,
      coinsDelta: 12,
      fishCaught: 2,
      sales: 1,
      itemsSold: 1,
      workerFishCaught: 0,
      workerItemsMoved: 0,
    });
    expect(lines.length).toBeGreaterThan(0);
  });

  it("dailygoals:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-offline-journal-daily-goals.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK dailygoals:validate");
  });
});
