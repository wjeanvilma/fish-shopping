import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLOUD_QA_2_SCENARIO_IDS,
  CLOUD_QA_SCENARIO_IDS,
  cloudQaFailures,
  runCloudQa2Harness,
  runCloudQaHarness,
} from "../src/cloud/cloudQaHarness";
import {
  CLOUD_QA_2_MARKER,
  CLOUD_QA_2_PHASE,
  CLOUD_QA_2_SCENARIO_FLOOR,
  CLOUD_QA_2_TOTAL_FLOOR,
  measureCloudQa2,
} from "../src/ship/cloudQa2";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Cloud QA harness 2 (Finish 3.0 Phase 17)", () => {
  it("locks phase 17 catalog floors", () => {
    expect(CLOUD_QA_2_PHASE).toBe(17);
    expect(CLOUD_QA_2_MARKER).toBe("authored-finish-3.0-phase-17");
    expect(CLOUD_QA_2_SCENARIO_FLOOR).toBe(8);
    expect(CLOUD_QA_2_TOTAL_FLOOR).toBe(12);
    expect(CLOUD_QA_2_SCENARIO_IDS).toHaveLength(8);
    expect(CLOUD_QA_SCENARIO_IDS.length).toBeGreaterThanOrEqual(12);
    expect((storeListing as { cloudQa2Phase?: number }).cloudQa2Phase).toBe(17);
  });

  it("measures harness wiring + kickoff", () => {
    const m = measureCloudQa2(root);
    expect(m.schemaVersion).toBeGreaterThanOrEqual(24);
    expect(m.wave2Complete).toBe(true);
    expect(m.totalComplete).toBe(true);
    expect(m.harnessSymbols).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.snippetOnly).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("wave-2 and full harness pass", async () => {
    const wave2 = await runCloudQa2Harness();
    expect(cloudQaFailures(wave2)).toEqual([]);
    const all = await runCloudQaHarness();
    expect(cloudQaFailures(all)).toEqual([]);
  });

  it("cloudqa2:validate exits 0", () => {
    const out = execFileSync("npm", ["run", "cloudqa2:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK cloudqa2:validate");
  });
});
