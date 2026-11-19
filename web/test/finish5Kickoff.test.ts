import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  baselineScoreboard,
  FINISH5_KICKOFF,
  FINISH5_KICKOFF_MARKER,
  FINISH5_KICKOFF_PHASE,
  FINISH5_KICKOFF_SCHEMA,
  FINISH5_OPEN_GAP_FLAGS,
  FINISH5_PHASE_COUNT,
  FINISH5_PLAN,
  finish5PhaseIds,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish5Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Finish 5.0 Phase 1 kickoff", () => {
  it("locks plan marker, prior freeze 4.0, and 30-phase roadmap", () => {
    expect(FINISH5_KICKOFF_PHASE).toBe(1);
    expect(FINISH5_KICKOFF_SCHEMA).toBe("fish.ship.finish5_kickoff.v1");
    expect(FINISH5_PLAN).toBe("30_finish_5.0");
    expect(FINISH5_KICKOFF_MARKER).toBe("authored-finish-5.0-phase-1");
    expect(FINISH5_KICKOFF.priorPlan.status).toBe("finished");
    expect(FINISH5_KICKOFF.priorPlan.id).toBe("30_finish_4.0");
    expect(FINISH5_KICKOFF.priorPlan.releaseTag).toBe("v4.0.0");
    expect(FINISH5_KICKOFF.endState.releaseTag).toBe("v5.0.0");
    expect(FINISH5_KICKOFF.endState.productLocMin).toBe(120_000);
    expect(FINISH5_KICKOFF.phases).toHaveLength(FINISH5_PHASE_COUNT);
    expect(requireThirtyPhases()).toBe(true);
    expect(finish5PhaseIds()[0]).toBe("kickoff");
    expect(finish5PhaseIds()[29]).toBe("freeze-5");
    expect((storeListing as { finish5KickoffPhase?: number }).finish5KickoffPhase).toBe(1);
    expect(existsSync(resolve(root, FINISH5_KICKOFF.parityFixture))).toBe(true);
  });

  it("scores Phase 1 gaps against live 4.0 baseline toward 120k", () => {
    const board = baselineScoreboard();
    expect(board.authoredHarbors.current).toBe(12);
    expect(board.authoredHarbors.remaining).toBe(0);
    expect(board.authoredHarbors.met).toBe(true);
    expect(board.authoredFish.current).toBe(125);
    expect(board.authoredFish.remaining).toBe(0);
    expect(board.productLoc.current).toBe(80175);
    expect(board.productLoc.remaining).toBe(39825);
    expect(board.species.met).toBe(true);
    expect(board.machines.met).toBe(true);
    expect(board.quests.met).toBe(true);
    expect(board.staffComingSoon.met).toBe(true);
    expect(board.openFlagCount).toBe(FINISH5_OPEN_GAP_FLAGS.length);
    // Soft-floor: Phase 29 closed parityLock5Missing → 0 open boolean flags remain.
    expect(board.openFlagCount).toBeGreaterThanOrEqual(0);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("engineDepthIncomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("harborArt5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("fishArt5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("productArt5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("atmosphere5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("audioVfx5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("endgameSchema26Pending");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("contentFloorsShort");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("tutorialRetentionIncomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("staffAi3Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("economy3Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("offlineCloud3Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("uiParity5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("a11yI18n5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("stripeOps5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("deeplinkE2e5Thin");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("devicePerf5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("contentCli5Missing");
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("parityLock5Missing");
    expect(FINISH5_OPEN_GAP_FLAGS.length).toBe(0);
    expect(board.allNumericGapsClosed).toBe(false);
    expect(productLocProgress(80175)).toBe(0);
    expect(summaryLine(board)).toContain("Finish 5.0 Phase 1 gaps");
  });

  it("wires RELEASE_PIN + finish5:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { finish5Kickoff?: string; finish4Kickoff?: string; fixtures?: string[] };
    expect(pin.finish5Kickoff).toBe("shared/ship/finish-5.0-kickoff.json");
    expect(pin.finish4Kickoff).toBe("shared/ship/finish-4.0-kickoff.json");
    expect(pin.fixtures).toContain("parity-finish-5.0-kickoff.json");
    const out = execFileSync("npm", ["run", "finish5:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK finish5:validate");
  });
});
