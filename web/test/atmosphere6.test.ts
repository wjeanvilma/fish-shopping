import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import {
  ATMOSPHERE_6,
  ATMOSPHERE_6_MARKER,
  ATMOSPHERE_6_PHASE,
  measureAtmosphere6,
} from "../src/ship/atmosphere6";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Atmosphere 6 (Finish 6.0 Phase 11)", () => {
  it("locks phase 11 catalog floors", () => {
    expect(ATMOSPHERE_6_PHASE).toBe(11);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(ATMOSPHERE_6_MARKER).toBe("authored-finish-6.0-phase-11");
    expect(ATMOSPHERE_6.atmosphereFinish6Marker).toBe("atmosphere-6");
    expect(ATMOSPHERE_6.finish6HarborTarget).toBeGreaterThanOrEqual(14);
    expect((storeListing as { atmosphere6Phase?: number }).atmosphere6Phase).toBe(11);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("atmosphere6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures stamped harbors with Finish 5 retained", () => {
    const m = measureAtmosphere6(root);
    expect(m.harborCount).toBeGreaterThanOrEqual(14);
    expect(m.stampedCount).toBeGreaterThanOrEqual(14);
    expect(m.finish5Retained).toBe(true);
    expect(m.socketsOk).toBe(true);
    expect(m.renderModulesPresent).toBe(true);
    expect(m.atmosphereSamplesOk).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("atmosphere6:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-atmosphere-6.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK atmosphere6:validate");
  }, 90_000);
});
