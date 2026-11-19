import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  baselineScoreboard,
  FINISH6_KICKOFF,
  FINISH6_KICKOFF_MARKER,
  FINISH6_KICKOFF_PHASE,
  FINISH6_KICKOFF_SCHEMA,
  FINISH6_OPEN_GAP_FLAGS,
  FINISH6_PHASE_COUNT,
  FINISH6_PLAN,
  finish6PhaseIds,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish6Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Finish 6.0 Phase 1 kickoff", () => {
  it("locks plan marker, prior freeze 5.0, and 30-phase roadmap", () => {
    expect(FINISH6_KICKOFF_PHASE).toBe(1);
    expect(FINISH6_KICKOFF_SCHEMA).toBe("fish.ship.finish6_kickoff.v1");
    expect(FINISH6_PLAN).toBe("30_finish_6.0");
    expect(FINISH6_KICKOFF_MARKER).toBe("authored-finish-6.0-phase-1");
    expect(FINISH6_KICKOFF.priorPlan.status).toBe("finished");
    expect(FINISH6_KICKOFF.priorPlan.id).toBe("30_finish_5.0");
    expect(FINISH6_KICKOFF.priorPlan.releaseTag).toBe("v5.0.0");
    expect(FINISH6_KICKOFF.endState.releaseTag).toBe("v6.0.0");
    expect(FINISH6_KICKOFF.endState.productLocMin).toBe(120_000);
    expect(FINISH6_KICKOFF.endState.schemaVersionMin).toBe(27);
    expect(FINISH6_KICKOFF.phases).toHaveLength(FINISH6_PHASE_COUNT);
    expect(requireThirtyPhases()).toBe(true);
    expect(finish6PhaseIds()[0]).toBe("kickoff");
    expect(finish6PhaseIds()[29]).toBe("freeze-6");
    expect((storeListing as { finish6KickoffPhase?: number }).finish6KickoffPhase).toBe(1);
    expect(existsSync(resolve(root, FINISH6_KICKOFF.parityFixture))).toBe(true);
  });

  it("scores Phase 1 gaps against live 5.0 baseline toward 120k + AI-lab caps", () => {
    const board = baselineScoreboard();
    expect(board.authoredHarbors.current).toBe(12);
    // Soft-floor: Phase 7 closed remaining; baseline current stays Phase-1 lock.
    expect(board.authoredHarbors.remaining).toBe(0);
    expect(board.authoredHarbors.met).toBe(false);
    expect(board.authoredFish.current).toBe(125);
    // Soft-floor: Phase 8 closed remaining; baseline current stays Phase-1 lock.
    expect(board.authoredFish.remaining).toBe(0);
    expect(board.productLoc.current).toBe(90597);
    expect(board.productLoc.remaining).toBe(29403);
    expect(board.species.met).toBe(false);
    // Soft-floor: Phase 9 closed remaining; baseline current stays Phase-1 lock (14).
    expect(board.machines.remaining).toBe(0);
    expect(board.machines.met).toBe(false);
    expect(board.quests.met).toBe(false);
    expect(board.staffComingSoon.met).toBe(true);
    expect(board.systemsTs.met).toBe(false);
    expect(board.gameViewModel.met).toBe(false);
    expect(board.gameHost.met).toBe(false);
    // Soft-floor: Phase 29 closed parityLock6Missing → 0 open flags.
    expect(board.openFlagCount).toBe(0);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("endgameSchema27Pending");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("contentFloorsShort");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("schemaFoundationsIncomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("shipCodegenMissing");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("systemsSplit3Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("hostVmCapsIncomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("harborArt6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("fishArt6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("productArt6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("atmosphere6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("parityLock6Missing");
    // Soft-floor: Phases 15–29 closed through parity-lock-6.
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("contentFloorsShort");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("staffAi4Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("economy4Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("offlineCloud4Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("tutorialRetention6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("uiParity6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("presenterHarnessMissing");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("a11yI18n6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("e2eDepthThin");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("composeE2eThin");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("stripeOps6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("loadtestBanksIncomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("contentCli6Missing");
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("devicePerf6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS).toHaveLength(0);
    expect(board.allNumericGapsClosed).toBe(false);
    expect(productLocProgress(90597)).toBe(0);
    expect(summaryLine(board)).toContain("Finish 6.0 Phase 1 gaps");
  });

  it("wires RELEASE_PIN + finish6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { finish6Kickoff?: string; finish5Kickoff?: string; fixtures?: string[] };
    expect(pin.finish6Kickoff).toBe("shared/ship/finish-6.0-kickoff.json");
    expect(pin.finish5Kickoff).toBe("shared/ship/finish-5.0-kickoff.json");
    expect(pin.fixtures).toContain("parity-finish-6.0-kickoff.json");
    const out = execFileSync("npm", ["run", "finish6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK finish6:validate");
  });
});
