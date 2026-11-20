/**
 * Finish 6.0 Phase 7 — harbors 13–14 catalog
 * (mirrors shared/ship/harbors-13-14.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import harborsJson from "../../../shared/ship/harbors-13-14.json";
import { loadContent } from "../engine";

export interface Harbor1314Entry {
  id: string;
  name: string;
  requires: string[];
  specialization: string;
  blockout: string;
  landingQuest: string;
  prestigeUnlock: string;
  gallery: string;
  theme: string;
}

export interface Harbors1314Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  harborCount: number;
  newHarborCount: number;
  harbors1314Marker: string;
  newHarbors: Harbor1314Entry[];
  circuitPrestige: string[];
  travelFixture: string;
  definitionOfDoneQuota: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const HARBORS_1314 = harborsJson as unknown as Harbors1314Catalog;
export const HARBORS_1314_PHASE = HARBORS_1314.phase;
export const HARBORS_1314_SCHEMA = HARBORS_1314.schema;
export const HARBORS_1314_MARKER = HARBORS_1314.harbors1314Marker;
export const HARBOR_COUNT_FLOOR_1314 = HARBORS_1314.harborCount;

export interface Harbors1314Measure {
  harborCount: number;
  newHarborsPresent: boolean;
  prestigePresent: boolean;
  questsPresent: boolean;
  galleriesPresent: boolean;
  blockoutsPresent: boolean;
  kickoffHarborMet: boolean;
  harborArt6Closed: boolean;
  missingGates: string[];
  missingBlockouts: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureHarbors1314(repoRoot: string): Harbors1314Measure {
  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const content = loadContent(JSON.parse(readFileSync(packPath, "utf8")));

  const newHarborsPresent = HARBORS_1314.newHarbors.every((h) => content.harborsById.has(h.id));
  const prestigePresent = HARBORS_1314.circuitPrestige.every((id) =>
    content.prestigeMilestonesById.has(id),
  );
  const questsPresent = HARBORS_1314.newHarbors.every((h) => content.questsById.has(h.landingQuest));
  const galleriesPresent = HARBORS_1314.newHarbors.every((h) => content.trophySetsById.has(h.gallery));

  const missingBlockouts: string[] = [];
  for (const entry of HARBORS_1314.newHarbors) {
    if (!existsSync(resolve(repoRoot, entry.blockout))) missingBlockouts.push(entry.blockout);
  }

  let kickoffHarborMet = false;
  let harborArt6Closed = false;
  const kickoffPath = resolve(repoRoot, HARBORS_1314.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    kickoffHarborMet =
      (kickoff?.baseline?.authoredHarbors ?? 0) === 12 &&
      (kickoff?.baseline?.harbors ?? 0) === 12 &&
      (kickoff?.gaps?.authoredHarborsRemaining ?? 1) === 0 &&
      (kickoff?.gapTargets?.harborsMin ?? 0) >= 14;
    harborArt6Closed = kickoff?.gaps?.harborArt6Incomplete === false;
  }

  const missingGates: string[] = [];
  for (const gate of HARBORS_1314.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    harborCount: content.harbors.length,
    newHarborsPresent,
    prestigePresent,
    questsPresent,
    galleriesPresent,
    blockoutsPresent: missingBlockouts.length === 0,
    kickoffHarborMet,
    harborArt6Closed,
    missingGates,
    missingBlockouts,
  };
}
