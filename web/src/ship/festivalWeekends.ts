/**
 * Finish 2.0 Phase 16 — festival weekends catalog
 * (mirrors shared/ship/festival-weekends.json).
 */
import festivalsJson from "../../../shared/ship/festival-weekends.json";

export interface FestivalWeekendsShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  weekendEventCount: number;
  events: string[];
  festivalCustomers: string[];
  parityFixture: string;
  validateScript: string;
}

export const FESTIVAL_WEEKENDS = festivalsJson as unknown as FestivalWeekendsShipCatalog;
export const FESTIVAL_WEEKENDS_PHASE = FESTIVAL_WEEKENDS.phase;
export const FESTIVAL_WEEKENDS_SCHEMA = FESTIVAL_WEEKENDS.schema;
export const FESTIVAL_WEEKEND_FLOOR = FESTIVAL_WEEKENDS.weekendEventCount;
