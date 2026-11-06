/**
 * Presentation-only frame timing (Phase 29). Tracks EMA frame ms and a soft
 * auto-downgrade signal when mid-device targets are missed. Never touches the 20 Hz sim.
 */
import type { QualityPreset } from "../game/settingsStore";

/** Mid-device frame-time targets (ms). Medium/high aim for ~60 Hz; low allows ~45 Hz. */
export const FRAME_TARGET_MS: Record<QualityPreset, number> = {
  low: 22.2,
  medium: 16.7,
  high: 16.7,
};

/** Sustained over-budget frames before suggesting one quality step down (~1.5 s @ 60 Hz). */
export const FRAME_DOWNGRADE_STREAK = 90;

const RANK: Record<QualityPreset, number> = { low: 0, medium: 1, high: 2 };

export function qualityRank(q: QualityPreset): number {
  return RANK[q];
}

export function downgradeQuality(q: QualityPreset): QualityPreset {
  if (q === "high") return "medium";
  if (q === "medium") return "low";
  return "low";
}

export class FrameTiming {
  private emaMs = 0;
  private lastMs = 0;
  private overStreak = 0;
  private readonly emaAlpha: number;
  private readonly downgradeStreak: number;

  constructor(emaAlpha = 0.08, downgradeStreak = FRAME_DOWNGRADE_STREAK) {
    this.emaAlpha = emaAlpha;
    this.downgradeStreak = downgradeStreak;
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
  }

  /**
   * Sample one display frame. [dtSeconds] is clamped presentation dt.
   * Returns true when a soft quality downgrade should be applied.
   */
  sample(dtSeconds: number, targetMs: number): boolean {
    const ms = Math.max(0, dtSeconds) * 1000;
    this.lastMs = ms;
    this.emaMs = this.emaMs === 0 ? ms : this.emaMs + (ms - this.emaMs) * this.emaAlpha;
    if (ms > targetMs * 1.15) this.overStreak += 1;
    else this.overStreak = 0;
    if (this.overStreak >= this.downgradeStreak) {
      this.overStreak = 0;
      return true;
    }
    return false;
  }
}
