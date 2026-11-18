import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  baselineScoreboard,
  FINISH4_KICKOFF,
  FINISH4_KICKOFF_MARKER,
  FINISH4_KICKOFF_PHASE,
  FINISH4_KICKOFF_SCHEMA,
  FINISH4_OPEN_GAP_FLAGS,
  FINISH4_PHASE_COUNT,
  FINISH4_PLAN,
  finish4PhaseIds,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish4Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Finish 4.0 Phase 1 kickoff", () => {
  it("locks plan marker, prior freeze 3.0, and 30-phase roadmap", () => {
    expect(FINISH4_KICKOFF_PHASE).toBe(1);
    expect(FINISH4_KICKOFF_SCHEMA).toBe("fish.ship.finish4_kickoff.v1");
    expect(FINISH4_PLAN).toBe("30_finish_4.0");
    expect(FINISH4_KICKOFF_MARKER).toBe("authored-finish-4.0-phase-1");
    expect(FINISH4_KICKOFF.priorPlan.status).toBe("finished");
    expect(FINISH4_KICKOFF.priorPlan.id).toBe("30_finish_3.0");
    expect(FINISH4_KICKOFF.priorPlan.releaseTag).toBe("v3.0.0");
    expect(FINISH4_KICKOFF.endState.releaseTag).toBe("v4.0.0");
    expect(FINISH4_KICKOFF.endState.productLocMin).toBe(100_000);
    expect(FINISH4_KICKOFF.phases).toHaveLength(FINISH4_PHASE_COUNT);
    expect(requireThirtyPhases()).toBe(true);
    expect(finish4PhaseIds()[0]).toBe("kickoff");
    expect(finish4PhaseIds()[29]).toBe("freeze-4");
    expect((storeListing as { finish4KickoffPhase?: number }).finish4KickoffPhase).toBe(1);
    expect(existsSync(resolve(root, FINISH4_KICKOFF.parityFixture))).toBe(true);
  });

  it("scores Phase 1 gaps against frozen 3.0.0 baseline toward 100k", () => {
    const board = baselineScoreboard();
    expect(board.authoredHarbors.current).toBe(10);
    expect(board.authoredHarbors.remaining).toBe(0);
    expect(board.authoredHarbors.met).toBe(true);
    expect(board.authoredFish.current).toBe(100);
    expect(board.authoredFish.remaining).toBe(0);
    expect(board.authoredFish.met).toBe(true);
    expect(board.productLoc.current).toBe(73473);
    expect(board.productLoc.remaining).toBe(26527);
    expect(board.species.met).toBe(true);
    expect(board.machines.met).toBe(true);
    expect(board.quests.met).toBe(true);
    expect(board.staffComingSoon.current).toBe(0);
    expect(board.staffComingSoon.met).toBe(true);
    expect(board.openFlagCount).toBe(FINISH4_OPEN_GAP_FLAGS.length);
    expect(board.openFlagCount).toBe(0);
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("systemsSplitIncomplete");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("viewModelSplitIncomplete");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("workersSimViewSplitIncomplete");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("gameHostSplitIncomplete");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("harborBlockoutPresent");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("productArtIncomplete");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("endgameSchema25Pending");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("contentFloorsShort");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("stripeOpsIncomplete");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("deeplinkE2eThin");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("devicePerfIncomplete");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("contentCli3Missing");
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("parityLock4Missing");
    expect(FINISH4_KICKOFF.gaps.endgameSchema25Pending).toBe(false);
    expect(FINISH4_KICKOFF.gaps.contentFloorsShort).toBe(false);
    expect(FINISH4_KICKOFF.gaps.stripeOpsIncomplete).toBe(false);
    expect(FINISH4_KICKOFF.gaps.deeplinkE2eThin).toBe(false);
    expect(FINISH4_KICKOFF.gaps.devicePerfIncomplete).toBe(false);
    expect(FINISH4_KICKOFF.gaps.contentCli3Missing).toBe(false);
    expect(FINISH4_KICKOFF.gaps.parityLock4Missing).toBe(false);
    expect(FINISH4_KICKOFF.gaps.systemsSplitIncomplete).toBe(false);
    expect(FINISH4_KICKOFF.gaps.viewModelSplitIncomplete).toBe(false);
    expect(FINISH4_KICKOFF.gaps.workersSimViewSplitIncomplete).toBe(false);
    expect(board.allNumericGapsClosed).toBe(false);
    expect(productLocProgress(73473)).toBe(0);
    expect(productLocProgress(100000)).toBe(100);
    expect(summaryLine(board)).toContain(`openFlags=${FINISH4_OPEN_GAP_FLAGS.length}`);

    const art = measureArtCounts(root);
    expect(art.authoredHarbors).toBe(10);
    expect(art.authoredFish).toBe(100);

    const pin = JSON.parse(readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"));
    expect(pin.finish4Kickoff).toBe("shared/ship/finish-4.0-kickoff.json");
    expect(pin.finish3Kickoff).toBe("shared/ship/finish-3.0-kickoff.json");
  });

  it("finish4:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-finish-4-kickoff.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK finish4:validate");
  }, 60_000);
});
