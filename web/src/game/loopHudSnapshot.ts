/**
 * Finish 5.0 Phase 5 — derived HUD snapshot for Finish 5 engine loops.
 * Presentation-only; never mutates sim state. Mirrors Android LoopHudSnapshot.
 */
import type { SimView } from "../engine";

export interface LoopHudSnapshot {
  castPhase: string | null;
  castStrikeStart01: number;
  castStrikeEnd01: number;
  ticksUntilBagSpoil: number | null;
  bagSpoilPressurePermille: number;
  serviceQueuePressurePermille: number;
  minPatienceTicksLeft: number | null;
  ticksUntilNearestContractDeadline: number | null;
  contractBoardPressurePermille: number;
  nextQuestProgressPermille: number | null;
}

export function loopHudSnapshotFrom(view: SimView): LoopHudSnapshot {
  return {
    castPhase: view.castPhase,
    castStrikeStart01: view.castStrikeStart01,
    castStrikeEnd01: view.castStrikeEnd01,
    ticksUntilBagSpoil: view.ticksUntilBagSpoil,
    bagSpoilPressurePermille: view.bagSpoilPressurePermille,
    serviceQueuePressurePermille: view.serviceQueuePressurePermille,
    minPatienceTicksLeft: view.minPatienceTicksLeft,
    ticksUntilNearestContractDeadline: view.ticksUntilNearestContractDeadline,
    contractBoardPressurePermille: view.contractBoardPressurePermille,
    nextQuestProgressPermille: view.nextQuestProgressPermille,
  };
}
