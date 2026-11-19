/**
 * Finish 5.0 Phase 18 — rivals/seasonal/baits/cosmetics growth
 * (mirrors shared/ship/rivals-seasonal-5.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/rivals-seasonal-5.json";
import { loadContent } from "../engine";

export interface RivalsSeasonal5Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  rivalsSeasonal5Marker: string;
  rivalsMin: number;
  seasonalEventsMin: number;
  baitsMin: number;
  cosmeticsMin: number;
  newRivalIds: string[];
  newEventIds: string[];
  newBaitIds: string[];
  newCosmeticIds: string[];
  newCosmeticSkus: string[];
  periodTicks: number;
  extendsRivalMarkets2: string;
  extendsSeasonalBait4: string;
  extendsCosmetics4: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const RIVALS_SEASONAL_5 = catalogJson as unknown as RivalsSeasonal5Catalog;
export const RIVALS_SEASONAL_5_PHASE = RIVALS_SEASONAL_5.phase;
export const RIVALS_SEASONAL_5_SCHEMA = RIVALS_SEASONAL_5.schema;
export const RIVALS_SEASONAL_5_MARKER = RIVALS_SEASONAL_5.rivalsSeasonal5Marker;

export interface RivalsSeasonal5Measure {
  rivalCount: number;
  seasonalCount: number;
  baitCount: number;
  cosmeticCount: number;
  harborsCovered: number;
  harborTotal: number;
  newRivalsPresent: boolean;
  newEventsPresent: boolean;
  newBaitsPresent: boolean;
  newCosmeticsPresent: boolean;
  kickoffFloorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureRivalsSeasonal5(repoRoot: string): RivalsSeasonal5Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const entitlements = readJson(resolve(repoRoot, "shared/billing/entitlements.json"));
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-5.0-kickoff.json"));

  const rivals = content.raw.rivalMarkets.rivals;
  const covered = new Set(rivals.flatMap((r) => r.harbors));
  const harborTotal = content.raw.harbors.length;

  const missingGates: string[] = [];
  for (const gate of RIVALS_SEASONAL_5.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const cosmetics = entitlements.cosmetics ?? [];
  const kickoffFloorsMet =
    (kickoff.baseline?.rivalMarkets ?? 0) >= RIVALS_SEASONAL_5.rivalsMin &&
    (kickoff.baseline?.seasonalEvents ?? 0) >= RIVALS_SEASONAL_5.seasonalEventsMin &&
    (kickoff.baseline?.baits ?? 0) >= RIVALS_SEASONAL_5.baitsMin &&
    (kickoff.baseline?.cosmetics ?? 0) >= RIVALS_SEASONAL_5.cosmeticsMin &&
    kickoff.gaps?.contentFloorsShort === false;

  return {
    rivalCount: rivals.length,
    seasonalCount: content.raw.seasonalEvents.events.length,
    baitCount: content.raw.bait.length,
    cosmeticCount: cosmetics.length,
    harborsCovered: covered.size,
    harborTotal,
    newRivalsPresent: RIVALS_SEASONAL_5.newRivalIds.every((id) =>
      rivals.some((r) => r.id === id),
    ),
    newEventsPresent: RIVALS_SEASONAL_5.newEventIds.every((id) =>
      content.raw.seasonalEvents.events.some((e) => e.id === id),
    ),
    newBaitsPresent: RIVALS_SEASONAL_5.newBaitIds.every((id) =>
      content.raw.bait.some((b) => b.id === id),
    ),
    newCosmeticsPresent: RIVALS_SEASONAL_5.newCosmeticIds.every((id) =>
      cosmetics.some((c: any) => c.grantsCosmetic === id),
    ),
    kickoffFloorsMet,
    missingGates,
  };
}
