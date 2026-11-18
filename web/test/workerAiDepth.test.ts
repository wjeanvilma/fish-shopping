import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  measureWorkerAiDepth,
  WORKER_AI_DEPTH,
  WORKER_AI_DEPTH_MARKER,
  WORKER_AI_DEPTH_PHASE,
} from "../src/ship/workerAiDepth";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Worker AI depth (Finish 3.0 Phase 11)", () => {
  it("locks phase 11 catalog floors", () => {
    expect(WORKER_AI_DEPTH_PHASE).toBe(11);
    expect(WORKER_AI_DEPTH.depthBehaviors).toHaveLength(5);
    expect(WORKER_AI_DEPTH.depthStats).toHaveLength(3);
    expect(WORKER_AI_DEPTH_MARKER).toBe("authored-finish-3.0-phase-11");
  });

  it("measures TS/Kotlin depth markers and kickoff wiring", () => {
    const m = measureWorkerAiDepth(root);
    expect(m.behaviorCount).toBe(5);
    expect(m.statCount).toBe(3);
    expect(m.tsMarkersOk).toBe(true);
    expect(m.kotlinMarkersOk).toBe(true);
    expect(m.tsStatsOk).toBe(true);
    expect(m.kotlinStatsOk).toBe(true);
    expect(m.branchesPresent).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.measuredAtPhase).toBeGreaterThanOrEqual(11);
    expect(m.missingGates).toEqual([]);
    expect(m.missingTsMarkers).toEqual([]);
    expect(m.missingKotlinMarkers).toEqual([]);
  });

  it("workerai:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-worker-ai-depth.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK workerai:validate");
  }, 60_000);
});
