/**
 * Finish 2.0 Phase 14 — fishing mastery catalog
 * (mirrors shared/ship/fishing-mastery.json).
 */
import masteryJson from "../../../shared/ship/fishing-mastery.json";

export interface FishingMasteryShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  maxLevel: number;
  techniqueCount: number;
  coachingTipCount: number;
  techniques: string[];
  coachingTips: string[];
  parityFixture: string;
  validateScript: string;
}

export const FISHING_MASTERY = masteryJson as unknown as FishingMasteryShipCatalog;
export const FISHING_MASTERY_PHASE = FISHING_MASTERY.phase;
export const FISHING_MASTERY_SCHEMA = FISHING_MASTERY.schema;
export const MASTERY_TECHNIQUE_FLOOR = FISHING_MASTERY.techniqueCount;
export const MASTERY_COACHING_TIP_FLOOR = FISHING_MASTERY.coachingTipCount;
