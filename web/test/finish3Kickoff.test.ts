import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  baselineScoreboard,
  FINISH3_KICKOFF,
  FINISH3_KICKOFF_MARKER,
  FINISH3_KICKOFF_PHASE,
  FINISH3_KICKOFF_SCHEMA,
  FINISH3_OPEN_GAP_FLAGS,
  FINISH3_PHASE_COUNT,
  FINISH3_PLAN,
  finish3PhaseIds,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish3Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Finish 3.0 Phase 1 kickoff", () => {
  it("locks plan marker, prior freeze, and 30-phase roadmap", () => {
    expect(FINISH3_KICKOFF_PHASE).toBe(1);
    expect(FINISH3_KICKOFF_SCHEMA).toBe("fish.ship.finish3_kickoff.v1");
    expect(FINISH3_PLAN).toBe("30_finish_3.0");
    expect(FINISH3_KICKOFF_MARKER).toBe("authored-finish-3.0-phase-1");
    expect(FINISH3_KICKOFF.priorPlan.status).toBe("finished");
    expect(FINISH3_KICKOFF.priorPlan.id).toBe("30_finish_2.0");
    expect(FINISH3_KICKOFF.endState.releaseTag).toBe("v3.0.0");
    expect(FINISH3_KICKOFF.phases).toHaveLength(FINISH3_PHASE_COUNT);
    expect(requireThirtyPhases()).toBe(true);
    expect(finish3PhaseIds()[0]).toBe("kickoff");
    expect(finish3PhaseIds()[29]).toBe("freeze-3");
    expect((storeListing as { finish3KickoffPhase?: number }).finish3KickoffPhase).toBe(1);
    expect(existsSync(resolve(root, FINISH3_KICKOFF.parityFixture))).toBe(true);
  });

  it("scores Phase 1 gaps against frozen 2.0.0 baseline", () => {
    const board = baselineScoreboard();
    expect(board.authoredHarbors.current).toBe(8);
    expect(board.authoredHarbors.remaining).toBe(0);
    expect(board.authoredHarbors.met).toBe(true);
    expect(board.authoredFish.current).toBe(50);
    expect(board.authoredFish.remaining).toBe(0);
    expect(board.authoredFish.met).toBe(true);
    expect(board.productLoc.current).toBe(64488);
    expect(board.productLoc.remaining).toBe(15512);
    expect(board.species.met).toBe(true);
    expect(board.machines.met).toBe(true);
    expect(board.quests.met).toBe(true);
    expect(board.staffComingSoon.current).toBe(0);
    expect(board.staffComingSoon.met).toBe(true);
    expect(board.openFlagCount).toBe(FINISH3_OPEN_GAP_FLAGS.length);
    expect(board.allNumericGapsClosed).toBe(false);
    expect(productLocProgress(64488)).toBe(0);
    expect(productLocProgress(80000)).toBe(100);
    expect(summaryLine(board)).toContain(`openFlags=${FINISH3_OPEN_GAP_FLAGS.length}`);

    const art = measureArtCounts(root);
    expect(art.authoredHarbors).toBe(8);
    expect(art.authoredFish).toBe(50);

    const pin = JSON.parse(readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"));
    expect(pin.finish3Kickoff).toBe("shared/ship/finish-3.0-kickoff.json");
  });

  it("finish3:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-finish-3-kickoff.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK finish3:validate");
  }, 60_000);
});
