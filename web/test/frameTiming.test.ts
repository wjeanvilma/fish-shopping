import { describe, expect, it } from "vitest";
import {
  downgradeQuality,
  upgradeQuality,
  FRAME_TARGET_MS,
  FrameTiming,
  HARBOR_CACHE_LIMIT,
  WEB_MEDIUM_MAX_CSS_HEIGHT,
} from "../src/render/frameTiming";

describe("FrameTiming", () => {
  it("targets mid-desktop 60 Hz budgets and soft-downgrades after a streak", () => {
    expect(FRAME_TARGET_MS.medium).toBeCloseTo(16.7, 1);
    expect(FRAME_TARGET_MS.low).toBeGreaterThan(FRAME_TARGET_MS.medium);
    expect(WEB_MEDIUM_MAX_CSS_HEIGHT).toBe(1080);
    // Finish 4.0 Phase 27 soft-floor (was 2).
    expect(HARBOR_CACHE_LIMIT).toBeGreaterThanOrEqual(3);
    expect(downgradeQuality("high")).toBe("medium");
    expect(downgradeQuality("medium")).toBe("low");
    expect(downgradeQuality("low")).toBe("low");
    expect(upgradeQuality("low")).toBe("medium");

    const timing = new FrameTiming(1, 3, 3);
    const target = FRAME_TARGET_MS.medium;
    expect(timing.sample(0.01, target)).toBe("hold");
    expect(timing.sample(0.03, target)).toBe("hold");
    expect(timing.sample(0.03, target)).toBe("hold");
    expect(timing.sample(0.03, target)).toBe("downgrade");
  });
});
