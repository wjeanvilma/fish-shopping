import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import {
  ATMOSPHERE_5,
  ATMOSPHERE_5_MARKER,
  ATMOSPHERE_5_PHASE,
  measureAtmosphere5,
} from "../src/ship/atmosphere5";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Atmosphere 5 (Finish 5.0 Phase 11)", () => {
  it("locks phase 11 catalog floors", () => {
    expect(ATMOSPHERE_5_PHASE).toBe(11);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(ATMOSPHERE_5_MARKER).toBe("authored-finish-5.0-phase-11");
    expect(ATMOSPHERE_5.finish5HarborTarget).toBe(10);
    expect(ATMOSPHERE_5.atmosphereFinish5Marker).toBe("atmosphere-5");
    expect((storeListing as { atmosphere5Phase?: number }).atmosphere5Phase).toBe(11);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("atmosphere5Incomplete");
  });

  it("measures stamped harbors + render modules", () => {
    const m = measureAtmosphere5(root);
    expect(m.harborCount).toBeGreaterThanOrEqual(10);
    expect(m.stampedCount).toBeGreaterThanOrEqual(10);
    expect(m.socketsOk).toBe(true);
    expect(m.renderModulesPresent).toBe(true);
    expect(m.atmosphereSamplesOk).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("atmosphere5:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-atmosphere-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK atmosphere5:validate");
  });
});
