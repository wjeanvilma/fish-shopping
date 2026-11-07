/**
 * Phase 15 (post-1.0) — perf budget gate catalog + synthetic CI smoke helper.
 */
import gateJson from "../../../shared/perf/budget-gate.json";
import matrixJson from "../../../shared/perf/device-matrix.json";
import {
  FRAME_DOWNGRADE_STREAK,
  FRAME_OVER_BUDGET_MULT,
  FRAME_TARGET_MS,
  FrameTiming,
  HARBOR_CACHE_LIMIT,
  WEB_MEDIUM_MAX_CSS_HEIGHT,
  downgradeQuality,
} from "./frameTiming";
import {
  CROWD_DRAW_CAP_BY_QUALITY,
  FLYING_TRANSFER_POOL_BY_QUALITY,
  VFX_BURST_POOL_BY_QUALITY,
} from "./presenters";

export interface PerfBudgetGateCatalog {
  phase: number;
  schema: string;
  phase26Catalog: string;
  simHzInvariant: number;
  budgets: {
    android: {
      targetFps: number;
      frameTargetMs: { low: number; medium: number; high: number };
      downgradeStreakFrames: number;
      overBudgetMultiplier: number;
    };
    web: {
      targetFps: number;
      frameTargetMs: { low: number; medium: number; high: number };
      downgradeStreakFrames: number;
      overBudgetMultiplier: number;
      maxCssHeightMedium: number;
    };
  };
  presenterCaps: {
    crowd: { low: number; medium: number; high: number };
    fly: { low: number; medium: number; high: number };
    burst: { low: number; medium: number; high: number };
  };
  vfxJuicePhase?: number;
  vfxJuiceCatalog?: string;
  shakeScale?: { low: number; medium: number; high: number };
  maxShakeAmplitudeM?: number;
  harborCacheLimit: number;
  smoke: {
    syntheticDowngradeStreak: number;
    overBudgetDtSeconds: number;
    underBudgetDtSeconds: number;
    expectDowngradeAfterStreak: boolean;
  };
  failCriteria: string[];
  deviceChecklist: string[];
}

export const perfBudgetGate = gateJson as unknown as PerfBudgetGateCatalog;
export const PERF_BUDGET_GATE_PHASE = perfBudgetGate.phase;
export const PERF_BUDGET_GATE_SCHEMA = perfBudgetGate.schema;

export function webBudgetsMatchRuntime(): string[] {
  const errors: string[] = [];
  const web = perfBudgetGate.budgets.web;
  const matrixWeb = (matrixJson as typeof matrixJson).platforms.web;
  if (FRAME_TARGET_MS.low !== web.frameTargetMs.low) errors.push("FRAME_TARGET_MS.low drift");
  if (FRAME_TARGET_MS.medium !== web.frameTargetMs.medium) errors.push("FRAME_TARGET_MS.medium drift");
  if (FRAME_TARGET_MS.high !== web.frameTargetMs.high) errors.push("FRAME_TARGET_MS.high drift");
  if (FRAME_DOWNGRADE_STREAK !== web.downgradeStreakFrames) errors.push("downgrade streak drift");
  if (FRAME_OVER_BUDGET_MULT !== web.overBudgetMultiplier) errors.push("over-budget mult drift");
  if (WEB_MEDIUM_MAX_CSS_HEIGHT !== web.maxCssHeightMedium) errors.push("1080 CSS height drift");
  if (HARBOR_CACHE_LIMIT !== perfBudgetGate.harborCacheLimit) errors.push("harbor cache drift");
  if (matrixWeb.frameTargetMs.medium !== web.frameTargetMs.medium) {
    errors.push("gate web medium ≠ Phase 26 matrix");
  }
  return errors;
}

export function presenterCapsMatchRuntime(): string[] {
  const errors: string[] = [];
  const caps = perfBudgetGate.presenterCaps;
  for (const q of ["low", "medium", "high"] as const) {
    if (CROWD_DRAW_CAP_BY_QUALITY[q] !== caps.crowd[q]) errors.push(`crowd.${q}`);
    if (FLYING_TRANSFER_POOL_BY_QUALITY[q] !== caps.fly[q]) errors.push(`fly.${q}`);
    if (VFX_BURST_POOL_BY_QUALITY[q] !== caps.burst[q]) errors.push(`burst.${q}`);
  }
  return errors;
}

/** Synthetic CI smoke: sustained over-budget frames must request a downgrade. */
export function runSyntheticDowngradeSmoke(): { ok: boolean; detail: string } {
  const smoke = perfBudgetGate.smoke;
  const timing = new FrameTiming(1, smoke.syntheticDowngradeStreak);
  const target = FRAME_TARGET_MS.medium;
  timing.sample(smoke.underBudgetDtSeconds, target);
  let downgraded = false;
  for (let i = 0; i < smoke.syntheticDowngradeStreak; i++) {
    if (timing.sample(smoke.overBudgetDtSeconds, target)) downgraded = true;
  }
  if (smoke.expectDowngradeAfterStreak && !downgraded) {
    return { ok: false, detail: "expected downgrade after over-budget streak" };
  }
  if (downgradeQuality("medium") !== "low") {
    return { ok: false, detail: "medium must downgrade to low" };
  }
  return { ok: true, detail: "synthetic downgrade smoke passed" };
}
