/**
 * Finish 6.0 Phase 21 — Presenter/render CPU snapshot harness.
 * Presentation-only; never touches the 20 Hz sim. Mirrors Android PresenterCpuSnapshot.
 */
import type { QualityPreset } from "../game/settingsStore";
import {
  CROWD_DRAW_CAP_BY_QUALITY,
  FLYING_TRANSFER_POOL_BY_QUALITY,
  type PresenterQuality,
} from "./presenters/quality";
import { VFX_BURST_POOL_BY_QUALITY } from "./presenters/vfx";
import {
  FRAME_OVER_BUDGET_MULT,
  FRAME_TARGET_MS,
  FrameTiming,
  HARBOR_CACHE_LIMIT,
  type FrameBudgetAction,
} from "./frameTiming";

/** Nest + core presenter stages sampled by the harness. */
export const PRESENTER_CPU_STAGES = [
  "crowd",
  "fly",
  "burst",
  "locomotion",
  "qualityBind",
  "nestHud",
] as const;

export type PresenterCpuStage = (typeof PRESENTER_CPU_STAGES)[number];

export interface PresenterCpuStageMs {
  crowd: number;
  fly: number;
  burst: number;
  locomotion: number;
  qualityBind: number;
  nestHud: number;
}

export interface PresenterCpuCaps {
  crowd: number;
  fly: number;
  burst: number;
}

export interface PresenterCpuSnapshot {
  lastFrameMs: number;
  emaFrameMs: number;
  targetMs: number;
  overBudget: boolean;
  budgetAction: FrameBudgetAction;
  quality: QualityPreset;
  harborCacheLimit: number;
  sampleCount: number;
  stageMs: PresenterCpuStageMs;
  caps: PresenterCpuCaps;
  nestHudPressurePermille: number;
}

function emptyStages(): PresenterCpuStageMs {
  return {
    crowd: 0,
    fly: 0,
    burst: 0,
    locomotion: 0,
    qualityBind: 0,
    nestHud: 0,
  };
}

function capsFor(quality: PresenterQuality): PresenterCpuCaps {
  return {
    crowd: CROWD_DRAW_CAP_BY_QUALITY[quality],
    fly: FLYING_TRANSFER_POOL_BY_QUALITY[quality],
    burst: VFX_BURST_POOL_BY_QUALITY[quality],
  };
}

function toPresenterQuality(q: QualityPreset): PresenterQuality {
  return q;
}

/**
 * Build a pure snapshot from measured frame + stage samples (testable without GL).
 */
export function presenterCpuSnapshotFrom(input: {
  lastFrameMs: number;
  emaFrameMs: number;
  targetMs: number;
  budgetAction: FrameBudgetAction;
  quality: QualityPreset;
  sampleCount: number;
  stageMs?: Partial<PresenterCpuStageMs>;
  nestHudPressurePermille?: number;
}): PresenterCpuSnapshot {
  const stageMs = { ...emptyStages(), ...(input.stageMs ?? {}) };
  const overBudget = input.lastFrameMs > input.targetMs * FRAME_OVER_BUDGET_MULT;
  return {
    lastFrameMs: input.lastFrameMs,
    emaFrameMs: input.emaFrameMs,
    targetMs: input.targetMs,
    overBudget,
    budgetAction: input.budgetAction,
    quality: input.quality,
    harborCacheLimit: HARBOR_CACHE_LIMIT,
    sampleCount: input.sampleCount,
    stageMs,
    caps: capsFor(toPresenterQuality(input.quality)),
    nestHudPressurePermille: Math.max(0, Math.min(1000, input.nestHudPressurePermille ?? 0)),
  };
}

/**
 * Live harness: times presenter stages and mirrors FrameTiming into a CPU snapshot.
 */
export class PresenterCpuHarness {
  private readonly timing: FrameTiming;
  private readonly stageMs = emptyStages();
  private readonly stageStarts = new Map<PresenterCpuStage, number>();
  private sampleCount = 0;
  private lastAction: FrameBudgetAction = "hold";
  private quality: QualityPreset = "medium";
  private nestHudPressurePermille = 0;
  private nowMs: () => number;

  constructor(opts?: { timing?: FrameTiming; nowMs?: () => number }) {
    this.timing = opts?.timing ?? new FrameTiming();
    this.nowMs = opts?.nowMs ?? (() => performance.now());
  }

  beginStage(stage: PresenterCpuStage): void {
    this.stageStarts.set(stage, this.nowMs());
  }

  endStage(stage: PresenterCpuStage): void {
    const start = this.stageStarts.get(stage);
    if (start == null) return;
    this.stageStarts.delete(stage);
    const elapsed = Math.max(0, this.nowMs() - start);
    this.stageMs[stage] = elapsed;
  }

  /** Inject a measured stage cost without wall-clock (tests / host bindings). */
  recordStageMs(stage: PresenterCpuStage, ms: number): void {
    this.stageMs[stage] = Math.max(0, ms);
  }

  setNestHudPressurePermille(permille: number): void {
    this.nestHudPressurePermille = Math.max(0, Math.min(1000, Math.trunc(permille)));
  }

  sampleFrame(dtSeconds: number, quality: QualityPreset): FrameBudgetAction {
    this.quality = quality;
    const target = FRAME_TARGET_MS[quality];
    this.lastAction = this.timing.sample(dtSeconds, target);
    this.sampleCount += 1;
    return this.lastAction;
  }

  snapshot(): PresenterCpuSnapshot {
    return presenterCpuSnapshotFrom({
      lastFrameMs: this.timing.lastFrameMs,
      emaFrameMs: this.timing.emaFrameMs,
      targetMs: FRAME_TARGET_MS[this.quality],
      budgetAction: this.lastAction,
      quality: this.quality,
      sampleCount: this.sampleCount,
      stageMs: { ...this.stageMs },
      nestHudPressurePermille: this.nestHudPressurePermille,
    });
  }

  reset(): void {
    this.timing.reset();
    for (const k of PRESENTER_CPU_STAGES) this.stageMs[k] = 0;
    this.stageStarts.clear();
    this.sampleCount = 0;
    this.lastAction = "hold";
    this.nestHudPressurePermille = 0;
  }
}
