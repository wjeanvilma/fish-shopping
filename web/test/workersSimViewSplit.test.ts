import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  measureWorkersSimViewSplit,
  WORKERS_SIMVIEW_SPLIT,
  WORKERS_SIMVIEW_SPLIT_MARKER,
  WORKERS_SIMVIEW_SPLIT_PHASE,
  WORKERS_SIMVIEW_SPLIT_SCHEMA,
} from "../src/ship/workersSimViewSplit";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Workers + SimView split (Finish 4.0 Phase 5)", () => {
  it("locks slim Workers/SimView + AI decision hooks", () => {
    expect(WORKERS_SIMVIEW_SPLIT_PHASE).toBe(5);
    expect(WORKERS_SIMVIEW_SPLIT_SCHEMA).toBe("fish.ship.workers_simview_split.v1");
    expect(WORKERS_SIMVIEW_SPLIT.plan).toBe("30_finish_4.0");
    expect(WORKERS_SIMVIEW_SPLIT_MARKER).toBe("authored-finish-4.0-phase-5");
    expect(WORKERS_SIMVIEW_SPLIT.requiredFiles).toHaveLength(5);
    expect((storeListing as { workersSimViewSplitPhase?: number }).workersSimViewSplitPhase).toBe(5);
    expect(existsSync(resolve(root, WORKERS_SIMVIEW_SPLIT.parityFixture))).toBe(true);

    const m = measureWorkersSimViewSplit(root);
    expect(m.workersSlim).toBe(true);
    expect(m.workersLines).toBeLessThanOrEqual(600);
    expect(m.workersLines).toBeLessThan(1638);
    expect(m.simViewSlim).toBe(true);
    expect(m.simViewLines).toBeLessThanOrEqual(800);
    expect(m.simViewLines).toBeLessThan(1517);
    expect(m.extractedEnough).toBe(true);
    expect(m.missingFiles).toEqual([]);
    expect(m.missingSymbols).toEqual([]);
    expect(m.stillDefines).toEqual([]);
    expect(m.gapClosed).toBe(true);
    expect(m.decisionHooksWired).toBe(true);
  });

  it("workersplit:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-workers-simview-split.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK workersplit:validate");
  }, 60_000);
});
