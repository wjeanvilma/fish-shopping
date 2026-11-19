/**
 * Presentation-only frame timing (Phase 26 device matrix).
 * Finish 4.0 Phase 27 — tighter streaks/mult + soft auto-upgrade toward requested preset.
 * Never touches the 20 Hz sim. Mirrors shared/perf/device-matrix.json (web).
 */
import type { QualityPreset } from "../game/settingsStore";
import matrix from "../../../shared/perf/device-matrix.json";

const web = matrix.platforms.web;

/** Mid-desktop frame-time targets (ms). Medium/high aim for ~60 Hz; low allows ~45 Hz. */
export const FRAME_TARGET_MS: Record<QualityPreset, number> = {
  low: web.frameTargetMs.low,
  medium: web.frameTargetMs.medium,
  high: web.frameTargetMs.high,
};

/** Sustained over-budget frames before one quality step down. */
export const FRAME_DOWNGRADE_STREAK = web.downgradeStreakFrames;

/** Sustained under-budget frames before one quality step up (capped at requested). */
export const FRAME_UPGRADE_STREAK = web.upgradeStreakFrames;

/** Phase 26: medium quality draws at most this CSS height (1080p mid desktop). */
export const WEB_MEDIUM_MAX_CSS_HEIGHT = web.maxCssHeightMedium;

/** Harbor GLB LRU size (web + Android). Finish 5.0 Phase 27 soft-floor → 4. */
export const HARBOR_CACHE_LIMIT = matrix.harborCacheLimit;

/** Over-budget multiplier from the device matrix. */
export const FRAME_OVER_BUDGET_MULT = matrix.autoDowngrade.overBudgetMultiplier;

/** Under-budget multiplier for soft auto-upgrade. */
export const FRAME_UNDER_BUDGET_MULT = matrix.autoUpgrade.underBudgetMultiplier;

export type FrameBudgetAction = "hold" | "downgrade" | "upgrade";

const RANK: Record<QualityPreset, number> = { low: 0, medium: 1, high: 2 };

export function qualityRank(q: QualityPreset): number {
  return RANK[q];
}

export function downgradeQuality(q: QualityPreset): QualityPreset {
  if (q === "high") return "medium";
  if (q === "medium") return "low";
  return "low";
}

export function upgradeQuality(q: QualityPreset): QualityPreset {
  if (q === "low") return "medium";
  if (q === "medium") return "high";
  return "high";
}

export class FrameTiming {
  private emaMs = 0;
  private lastMs = 0;
  private overStreak = 0;
  private underStreak = 0;
  private readonly emaAlpha: number;
  private readonly downgradeStreak: number;
  private readonly upgradeStreak: number;

  constructor(
    emaAlpha = 0.08,
    downgradeStreak = FRAME_DOWNGRADE_STREAK,
    upgradeStreak = FRAME_UPGRADE_STREAK,
  ) {
    this.emaAlpha = emaAlpha;
    this.downgradeStreak = downgradeStreak;
    this.upgradeStreak = upgradeStreak;
  }

  get emaFrameMs(): number {
    return this.emaMs;
  }

  get lastFrameMs(): number {
    return this.lastMs;
  }

  reset(): void {
    this.emaMs = 0;
    this.lastMs = 0;
    this.overStreak = 0;
    this.underStreak = 0;
  }

  /**
   * Sample one display frame. [dtSeconds] is clamped presentation dt.
   * Returns budget action for soft quality step (never exceeds caller-requested cap).
   */
  sample(dtSeconds: number, targetMs: number): FrameBudgetAction {
    const ms = Math.max(0, dtSeconds) * 1000;
    this.lastMs = ms;
    this.emaMs = this.emaMs === 0 ? ms : this.emaMs + (ms - this.emaMs) * this.emaAlpha;
    if (ms > targetMs * FRAME_OVER_BUDGET_MULT) {
      this.overStreak += 1;
      this.underStreak = 0;
      if (this.overStreak >= this.downgradeStreak) {
        this.overStreak = 0;
        return "downgrade";
      }
      return "hold";
    }
    this.overStreak = 0;
    if (ms < targetMs * FRAME_UNDER_BUDGET_MULT) {
      this.underStreak += 1;
      if (this.underStreak >= this.upgradeStreak) {
        this.underStreak = 0;
        return "upgrade";
      }
      return "hold";
    }
    this.underStreak = 0;
    return "hold";
  }
}
