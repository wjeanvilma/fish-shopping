import { describe, expect, it } from "vitest";
import {
  downgradeQuality,
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
    expect(HARBOR_CACHE_LIMIT).toBe(2);
    expect(downgradeQuality("high")).toBe("medium");
    expect(downgradeQuality("medium")).toBe("low");
    expect(downgradeQuality("low")).toBe("low");

    const timing = new FrameTiming(1, 3);
    const target = FRAME_TARGET_MS.medium;
    expect(timing.sample(0.01, target)).toBe(false);
    expect(timing.sample(0.03, target)).toBe(false);
    expect(timing.sample(0.03, target)).toBe(false);
    expect(timing.sample(0.03, target)).toBe(true);
  });
});
