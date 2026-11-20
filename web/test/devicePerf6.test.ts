import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HARBOR_CACHE_LIMIT } from "../src/render/frameTiming";
import {
  CROWD_DRAW_CAP_BY_QUALITY,
  FLYING_TRANSFER_POOL,
} from "../src/render/presenters/quality";
import { VFX_BURST_POOL } from "../src/render/presenters/vfx";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  DEVICE_PERF_6_HARBOR_CACHE_FLOOR,
  DEVICE_PERF_6_MARKER,
  DEVICE_PERF_6_PHASE,
  measureDevicePerf6,
} from "../src/ship/devicePerf6";

const root = resolve(__dirname, "../..");

describe("Device perf 6 (Finish 6.0 Phase 28)", () => {
  it("locks harbor LRU + denser nest floors and closes devicePerf6Incomplete", () => {
    expect(DEVICE_PERF_6_PHASE).toBe(28);
    expect(DEVICE_PERF_6_MARKER).toBe("authored-finish-6.0-phase-28");
    expect(DEVICE_PERF_6_HARBOR_CACHE_FLOOR).toBe(5);
    expect(HARBOR_CACHE_LIMIT).toBeGreaterThanOrEqual(5);
    expect(FLYING_TRANSFER_POOL).toBeGreaterThanOrEqual(20);
    expect(CROWD_DRAW_CAP_BY_QUALITY.high).toBeGreaterThanOrEqual(12);
    expect(VFX_BURST_POOL).toBeGreaterThanOrEqual(12);
    const m = measureDevicePerf6(root);
    expect(m.floorsMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("devicePerf6Incomplete");
    // Soft-floor: Phase 29 closed parityLock6Missing → 0 open flags.
    expect(FINISH6_OPEN_GAP_FLAGS).toHaveLength(0);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        devicePerf6Phase?: number;
      }).devicePerf6Phase,
    ).toBe(28);
  });

  it("deviceperf6:validate exits 0", () => {
    execFileSync("npm", ["run", "deviceperf6:validate"], {
      cwd: resolve(root, "web"),
      stdio: "pipe",
    });
  });
});
