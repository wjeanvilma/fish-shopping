/**
 * Finish 6.0 Phase 12 — presentation-only nest edge cues.
 * Detects rising edges for nest settle / aurora crest stingers.
 */
import type { SimView } from "../engine/view";
import type { SfxCue } from "./sfxCues";
import { VFX_JUICE_6 } from "../ship/vfxJuice6";

export interface NestFlags {
  nestSettle: boolean;
  auroraCrest: boolean;
}

export function nestFlagsFromView(v: SimView | null | undefined, nightActive = false): NestFlags {
  const settledMin = VFX_JUICE_6.ambientNest.settledMinPlacements;
  const roostingMin = VFX_JUICE_6.ambientNest.roostingMinPlacements;
  const placements = v?.decorPlacements?.length ?? 0;
  return {
    nestSettle: placements >= settledMin,
    auroraCrest: nightActive && placements >= roostingMin,
  };
}

/** Rising-edge SFX cues when nest thresholds are newly crossed. */
export function edgeNestSfx(prev: NestFlags, next: NestFlags): SfxCue[] {
  const out: SfxCue[] = [];
  if (next.nestSettle && !prev.nestSettle) out.push("nest_settle");
  if (next.auroraCrest && !prev.auroraCrest) out.push("aurora_crest");
  return out;
}

export function nestActiveFromFlags(flags: NestFlags): boolean {
  return flags.nestSettle || flags.auroraCrest;
}

export const EMPTY_NEST_FLAGS: NestFlags = {
  nestSettle: false,
  auroraCrest: false,
};
