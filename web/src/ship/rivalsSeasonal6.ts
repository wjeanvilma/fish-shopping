/**
 * Finish 6.0 Phase 15 — rivals/seasonal/baits/cosmetics growth
 * (mirrors shared/ship/rivals-seasonal-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/rivals-seasonal-6.json";
import { loadContent } from "../engine";

export interface RivalsSeasonal6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  rivalsSeasonal6Marker: string;
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
  extendsRivalsSeasonal5: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const RIVALS_SEASONAL_6 = catalogJson as unknown as RivalsSeasonal6Catalog;
export const RIVALS_SEASONAL_6_PHASE = RIVALS_SEASONAL_6.phase;
export const RIVALS_SEASONAL_6_SCHEMA = RIVALS_SEASONAL_6.schema;
export const RIVALS_SEASONAL_6_MARKER = RIVALS_SEASONAL_6.rivalsSeasonal6Marker;

export interface RivalsSeasonal6Measure {
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

export function measureRivalsSeasonal6(repoRoot: string): RivalsSeasonal6Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const entitlements = readJson(resolve(repoRoot, "shared/billing/entitlements.json"));
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-6.0-kickoff.json"));

  const rivals = content.raw.rivalMarkets.rivals;
  const covered = new Set(rivals.flatMap((r) => r.harbors));
  const harborTotal = content.raw.harbors.length;

  const missingGates: string[] = [];
  for (const gate of RIVALS_SEASONAL_6.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const cosmetics = entitlements.cosmetics ?? [];
  const kickoffFloorsMet =
    kickoff.gaps?.contentFloorsShort === false &&
    rivals.length >= RIVALS_SEASONAL_6.rivalsMin &&
    content.raw.seasonalEvents.events.length >= RIVALS_SEASONAL_6.seasonalEventsMin &&
    content.raw.bait.length >= RIVALS_SEASONAL_6.baitsMin &&
    cosmetics.length >= RIVALS_SEASONAL_6.cosmeticsMin;

  return {
    rivalCount: rivals.length,
    seasonalCount: content.raw.seasonalEvents.events.length,
    baitCount: content.raw.bait.length,
    cosmeticCount: cosmetics.length,
    harborsCovered: covered.size,
    harborTotal,
    newRivalsPresent: RIVALS_SEASONAL_6.newRivalIds.every((id) =>
      rivals.some((r) => r.id === id),
    ),
    newEventsPresent: RIVALS_SEASONAL_6.newEventIds.every((id) =>
      content.raw.seasonalEvents.events.some((e) => e.id === id),
    ),
    newBaitsPresent: RIVALS_SEASONAL_6.newBaitIds.every((id) =>
      content.raw.bait.some((b) => b.id === id),
    ),
    newCosmeticsPresent: RIVALS_SEASONAL_6.newCosmeticIds.every((id) =>
      cosmetics.some((c: any) => c.grantsCosmetic === id),
    ),
    kickoffFloorsMet,
    missingGates,
  };
}
