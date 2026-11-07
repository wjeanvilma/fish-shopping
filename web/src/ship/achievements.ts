/**
 * Finish 2.0 Phase 11 — achievements catalog
 * (mirrors shared/ship/achievements.json).
 */
import achievementsJson from "../../../shared/ship/achievements.json";

export interface AchievementsShipEntry {
  id: string;
  category: string;
  goalStat: string;
  goalAtLeast: number;
  rewardCoins: number;
}

export interface AchievementsShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  achievementCount: number;
  entries: AchievementsShipEntry[];
  parityFixture: string;
  definitionOfDoneAchievements: number;
  checklist: string[];
  preflightGates: string[];
}

export const ACHIEVEMENTS_SHIP = achievementsJson as unknown as AchievementsShipCatalog;
export const ACHIEVEMENTS_SHIP_PHASE = ACHIEVEMENTS_SHIP.phase;
export const ACHIEVEMENTS_SHIP_SCHEMA = ACHIEVEMENTS_SHIP.schema;
export const ACHIEVEMENT_COUNT_FLOOR = ACHIEVEMENTS_SHIP.achievementCount;
