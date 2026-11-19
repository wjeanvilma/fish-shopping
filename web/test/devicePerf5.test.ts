import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEVICE_PERF_5_HARBOR_CACHE_FLOOR,
  DEVICE_PERF_5_MARKER,
  DEVICE_PERF_5_PHASE,
  measureDevicePerf5,
} from "../src/ship/devicePerf5";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import { HARBOR_CACHE_LIMIT } from "../src/render/frameTiming";
import {
  CROWD_DRAW_CAP_BY_QUALITY,
  FLYING_TRANSFER_POOL,
} from "../src/render/presenters/quality";
import { VFX_BURST_POOL } from "../src/render/presenters/vfx";
import { SCHEMA_VERSION } from "../src/engine";

const root = resolve(__dirname, "../..");

describe("device perf 5 (Finish 5.0 Phase 27)", () => {
  it("locks denser floors and closes devicePerf5Incomplete", () => {
    expect(DEVICE_PERF_5_PHASE).toBe(27);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(DEVICE_PERF_5_MARKER).toBe("authored-finish-5.0-phase-27");
    expect(DEVICE_PERF_5_HARBOR_CACHE_FLOOR).toBe(4);
    expect(HARBOR_CACHE_LIMIT).toBeGreaterThanOrEqual(4);
    expect(FLYING_TRANSFER_POOL).toBeGreaterThanOrEqual(16);
    expect(CROWD_DRAW_CAP_BY_QUALITY.high).toBeGreaterThanOrEqual(10);
    expect(VFX_BURST_POOL).toBeGreaterThanOrEqual(10);
    const m = measureDevicePerf5(root);
    expect(m.floorsMet).toBe(true);
    expect(m.denserCapsWired).toBe(true);
    expect(m.upgradeWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("devicePerf5Incomplete");
    expect(FINISH5_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(2);
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { devicePerf5Phase?: number };
    expect(listing.devicePerf5Phase).toBe(27);
  });

  it("deviceperf5:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-device-perf-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK deviceperf5:validate");
  });
});
