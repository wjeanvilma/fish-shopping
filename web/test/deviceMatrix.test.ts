import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FRAME_DOWNGRADE_STREAK,
  FRAME_OVER_BUDGET_MULT,
  FRAME_TARGET_MS,
  FrameTiming,
  HARBOR_CACHE_LIMIT,
  WEB_MEDIUM_MAX_CSS_HEIGHT,
  downgradeQuality,
} from "../src/render/frameTiming";

describe("device matrix (Phase 26)", () => {
  const matrix = JSON.parse(
    readFileSync(resolve(__dirname, "../../shared/perf/device-matrix.json"), "utf8"),
  );

  it("documents Android 30 FPS and web 60@1080 budgets", () => {
    expect(matrix.phase).toBe(26);
    expect(matrix.schema).toBe("fish.perf.device_matrix.v1");
    expect(matrix.harborCacheLimit).toBe(2);
    expect(matrix.platforms.android.targetFps).toBe(30);
    expect(matrix.platforms.android.frameTargetMs.medium).toBeCloseTo(33.3, 1);
    expect(matrix.platforms.android.downgradeStreakFrames).toBe(45);
    expect(matrix.platforms.web.targetFps).toBe(60);
    expect(matrix.platforms.web.maxCssHeightMedium).toBe(1080);
    expect(matrix.platforms.web.frameTargetMs.medium).toBeCloseTo(16.7, 1);
    expect(matrix.platforms.web.downgradeStreakFrames).toBe(90);
  });

  it("wires web FrameTiming to the matrix catalog", () => {
    expect(FRAME_TARGET_MS.medium).toBe(matrix.platforms.web.frameTargetMs.medium);
    expect(FRAME_TARGET_MS.low).toBe(matrix.platforms.web.frameTargetMs.low);
    expect(FRAME_DOWNGRADE_STREAK).toBe(matrix.platforms.web.downgradeStreakFrames);
    expect(WEB_MEDIUM_MAX_CSS_HEIGHT).toBe(1080);
    expect(HARBOR_CACHE_LIMIT).toBe(2);
    expect(FRAME_OVER_BUDGET_MULT).toBe(1.15);
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
