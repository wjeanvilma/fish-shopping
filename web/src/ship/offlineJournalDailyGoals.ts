/**
 * Finish 2.0 Phase 18 — offline journal + daily goals catalog
 * (mirrors shared/ship/offline-journal-daily-goals.json).
 */
import catalogJson from "../../../shared/ship/offline-journal-daily-goals.json";

export interface OfflineJournalDailyGoalsShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  dailyObjectiveCount: number;
  boardSlots: number;
  objectives: string[];
  parityFixture: string;
  validateScript: string;
}

export const OFFLINE_JOURNAL_DAILY_GOALS =
  catalogJson as unknown as OfflineJournalDailyGoalsShipCatalog;
export const DAILY_GOALS_PHASE = OFFLINE_JOURNAL_DAILY_GOALS.phase;
export const DAILY_GOALS_SCHEMA = OFFLINE_JOURNAL_DAILY_GOALS.schema;
export const DAILY_OBJECTIVE_FLOOR = OFFLINE_JOURNAL_DAILY_GOALS.dailyObjectiveCount;
export const DAILY_BOARD_SLOTS_FLOOR = OFFLINE_JOURNAL_DAILY_GOALS.boardSlots;
