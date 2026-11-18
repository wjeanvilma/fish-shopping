/**
 * Finish 4.0 Phase 16 — seasonal→12, baits→12, mastery depth
 * (mirrors shared/ship/seasonal-bait-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/seasonal-bait-4.json";
import { loadContent } from "../engine";

export interface SeasonalBait4Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  seasonalBait4Marker: string;
  seasonalEventsMin: number;
  baitsMin: number;
  masteryMaxLevel: number;
  masteryTechniquesMin: number;
  masteryCoachingTipsMin: number;
  newEvents: string[];
  newBaits: string[];
  newTechniques: string[];
  newCoachingTips: string[];
  newFestivalCustomers: string[];
  newFestivalContracts: string[];
  extendsFestivalWeekends: string;
  extendsFishingMastery: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const SEASONAL_BAIT_4 = catalogJson as unknown as SeasonalBait4Catalog;
export const SEASONAL_BAIT_4_PHASE = SEASONAL_BAIT_4.phase;
export const SEASONAL_BAIT_4_SCHEMA = SEASONAL_BAIT_4.schema;
export const SEASONAL_BAIT_4_MARKER = SEASONAL_BAIT_4.seasonalBait4Marker;

export interface SeasonalBait4Measure {
  seasonalCount: number;
  baitCount: number;
  masteryMaxLevel: number;
  techniqueCount: number;
  coachingTipCount: number;
  newEventsPresent: boolean;
  newBaitsPresent: boolean;
  newTechniquesPresent: boolean;
  kickoffFloorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureSeasonalBait4(repoRoot: string): SeasonalBait4Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-4.0-kickoff.json"));

  const missingGates: string[] = [];
  for (const gate of SEASONAL_BAIT_4.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    seasonalCount: content.seasonalEvents.events.length,
    baitCount: content.bait.length,
    masteryMaxLevel: content.fishingMastery.maxLevel,
    techniqueCount: content.fishingMastery.techniques.length,
    coachingTipCount: content.fishingMastery.coachingTips.length,
    newEventsPresent: SEASONAL_BAIT_4.newEvents.every((id) => content.seasonalEventsById.has(id)),
    newBaitsPresent: SEASONAL_BAIT_4.newBaits.every((id) => content.baitById.has(id)),
    newTechniquesPresent: SEASONAL_BAIT_4.newTechniques.every((id) => content.techniquesById.has(id)),
    kickoffFloorsMet:
      (kickoff.baseline?.seasonalEvents ?? 0) >= SEASONAL_BAIT_4.seasonalEventsMin &&
      (kickoff.baseline?.baits ?? 0) >= SEASONAL_BAIT_4.baitsMin,
    missingGates,
  };
}
