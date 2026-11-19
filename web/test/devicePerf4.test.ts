import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEVICE_PERF_4_PHASE,
  DEVICE_PERF_HARBOR_CACHE_FLOOR,
  measureDevicePerf4,
} from "../src/ship/devicePerf4";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";
import {
  FRAME_DOWNGRADE_STREAK,
  FRAME_OVER_BUDGET_MULT,
  FRAME_UNDER_BUDGET_MULT,
  FRAME_UPGRADE_STREAK,
  HARBOR_CACHE_LIMIT,
  upgradeQuality,
} from "../src/render/frameTiming";
import { runSyntheticUpgradeSmoke } from "../src/render/perfBudgetGate";

const root = resolve(__dirname, "../..");

describe("device perf 4 (Finish 4.0 Phase 27)", () => {
  it("locks floors, upgrade path, and closes devicePerfIncomplete", () => {
    expect(DEVICE_PERF_4_PHASE).toBe(27);
    expect(DEVICE_PERF_HARBOR_CACHE_FLOOR).toBe(3);
    // Soft-floor: Finish 5.0 Phase 27 may raise live harbor LRU past 3.
    expect(HARBOR_CACHE_LIMIT).toBeGreaterThanOrEqual(3);
    expect(FRAME_OVER_BUDGET_MULT).toBe(1.12);
    expect(FRAME_UNDER_BUDGET_MULT).toBe(0.85);
    expect(FRAME_DOWNGRADE_STREAK).toBe(75);
    expect(FRAME_UPGRADE_STREAK).toBe(120);
    expect(upgradeQuality("low")).toBe("medium");
    const upgrade = runSyntheticUpgradeSmoke();
    expect(upgrade.ok).toBe(true);
    const m = measureDevicePerf4(root);
    expect(m.floorsMet).toBe(true);
    expect(m.upgradeWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("devicePerfIncomplete");
    expect(FINISH4_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(2);
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { devicePerf4Phase?: number };
    expect(listing.devicePerf4Phase).toBe(27);
  });

  it("deviceperf4:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-device-perf-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK deviceperf4:validate");
  });
});
