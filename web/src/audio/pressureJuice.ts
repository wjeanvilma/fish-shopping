/**
 * Finish 5.0 Phase 12 — presentation-only pressure edge cues.
 * Detects rising edges for spoil/service/contract/quest warn stingers.
 */
import type { SimView } from "../engine/view";
import type { SfxCue } from "./sfxCues";
import { VFX_JUICE_5 } from "../ship/vfxJuice5";

export interface PressureFlags {
  spoilWarn: boolean;
  serviceQueue: boolean;
  contractDeadline: boolean;
  questNear: boolean;
}

export function pressureFlagsFromView(v: SimView | null | undefined): PressureFlags {
  const rising = VFX_JUICE_5.ambientPressure.risingPermille;
  const critical = VFX_JUICE_5.ambientPressure.criticalPermille;
  const deadlineWarn = VFX_JUICE_5.ambientPressure.contractDeadlineWarnTicks;
  const questNear = VFX_JUICE_5.ambientPressure.questNearCompletePermille;
  return {
    spoilWarn: (v?.bagSpoilPressurePermille ?? 0) > critical,
    serviceQueue: (v?.serviceQueuePressurePermille ?? 0) >= rising,
    contractDeadline:
      v?.ticksUntilNearestContractDeadline != null &&
      v.ticksUntilNearestContractDeadline <= deadlineWarn,
    questNear:
      v?.nextQuestProgressPermille != null && v.nextQuestProgressPermille >= questNear,
  };
}

/** Rising-edge SFX cues when pressure thresholds are newly crossed. */
export function edgePressureSfx(prev: PressureFlags, next: PressureFlags): SfxCue[] {
  const out: SfxCue[] = [];
  if (next.spoilWarn && !prev.spoilWarn) out.push("spoil_warn");
  if (next.serviceQueue && !prev.serviceQueue) out.push("service_queue");
  if (next.contractDeadline && !prev.contractDeadline) out.push("contract_deadline");
  if (next.questNear && !prev.questNear) out.push("quest_near");
  return out;
}

export function pressureActiveFromFlags(flags: PressureFlags): boolean {
  return flags.spoilWarn || flags.serviceQueue || flags.contractDeadline || flags.questNear;
}

export const EMPTY_PRESSURE_FLAGS: PressureFlags = {
  spoilWarn: false,
  serviceQueue: false,
  contractDeadline: false,
  questNear: false,
};
