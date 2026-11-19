import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  WeeklyGoalsSystem,
  loadContent,
  GameState,
  Simulation,
  Stats,
} from "../src/engine";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  TUTORIAL_RETENTION_5_MARKER,
  TUTORIAL_RETENTION_5_PHASE,
  measureTutorialRetention5,
} from "../src/ship/tutorialRetention5";
import { storeListing } from "../src/store/listing";
import { tutorialFriction } from "../src/engine/tutorialFriction";
import { weeklyRetention } from "../src/engine/weeklyGoals";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Tutorial retention 5 (Finish 5.0 Phase 19)", () => {
  it("locks phase 19 catalog floors", () => {
    expect(TUTORIAL_RETENTION_5_PHASE).toBe(19);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(TUTORIAL_RETENTION_5_MARKER).toBe("authored-finish-5.0-phase-19");
    expect((storeListing as { tutorialRetention5Phase?: number }).tutorialRetention5Phase).toBe(19);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("tutorialRetentionIncomplete");
  });

  it("measures friction + daily/weekly retention floors", () => {
    const m = measureTutorialRetention5(root);
    expect(m.tutorialSteps).toBeGreaterThanOrEqual(11);
    expect(m.highFriction).toBeGreaterThanOrEqual(7);
    expect(m.nudges).toBeGreaterThanOrEqual(7);
    expect(m.dailyObjectives).toBeGreaterThanOrEqual(14);
    expect(m.boardSlots).toBeGreaterThanOrEqual(5);
    expect(m.maxStreakBonusDays).toBeGreaterThanOrEqual(14);
    expect(m.weeklyObjectives).toBeGreaterThanOrEqual(4);
    expect(m.weeklyBoardSlots).toBeGreaterThanOrEqual(2);
    expect(m.midGameFrictionPresent).toBe(true);
    expect(m.newDailiesPresent).toBe(true);
    expect(m.newWeekliesPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(tutorialFriction.funnel.highFrictionStepIds).toContain("tutorial.grill_line");
    expect(weeklyRetention.objectives.some((o) => o.id === "weekly.rival_week")).toBe(true);
  });

  it("rolls weekly board and claims a completed objective", () => {
    const harborId = content.raw.harbors[0]!.id;
    const sim = new Simulation(content, GameState.newGame(content, harborId, 42));
    const dayLen = content.dailyGoals.dayLengthMs;
    const epochMs = dayLen * weeklyRetention.weekLengthDays * 3 + dayLen;
    sim.step([{ type: "sync_wall_clock", epochMs }]);
    const board = WeeklyGoalsSystem.boardObjectives(sim.state);
    expect(board.length).toBeGreaterThanOrEqual(1);
    const objective = board[0]!;
    const baseline = sim.state.stat(WeeklyGoalsSystem.baselineKey(objective.goal.stat));
    sim.state.stats.set(objective.goal.stat, baseline + objective.goal.atLeast);
    expect(WeeklyGoalsSystem.isComplete(sim.state, objective)).toBe(true);
    sim.step([{ type: "claim_weekly_goal", objectiveId: objective.id, requestId: "claim-weekly-1" }]);
    expect(WeeklyGoalsSystem.isClaimed(content, sim.state, objective)).toBe(true);
    expect(sim.state.stat(Stats.WEEKLY_GOALS_CLAIMED)).toBeGreaterThanOrEqual(1);
  });

  it("wires RELEASE_PIN + tutorialretention5:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { tutorialRetention5?: string; fixtures?: string[] };
    expect(pin.tutorialRetention5).toBe("shared/ship/tutorial-retention-5.json");
    expect(pin.fixtures).toContain("parity-tutorial-retention-5.json");
    const out = execFileSync("npm", ["run", "tutorialretention5:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK tutorialretention5:validate");
  });
});
