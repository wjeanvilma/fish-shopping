/**
 * Finish 5.0 Phase 14 — harbors 11–12 catalog
 * (mirrors shared/ship/harbors-11-12.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import harborsJson from "../../../shared/ship/harbors-11-12.json";
import { loadContent } from "../engine";

export interface Harbor1112Entry {
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

export interface Harbors1112Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  harborCount: number;
  newHarborCount: number;
  harbors1112Marker: string;
  newHarbors: Harbor1112Entry[];
  circuitPrestige: string[];
  travelFixture: string;
  definitionOfDoneQuota: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const HARBORS_1112 = harborsJson as unknown as Harbors1112Catalog;
export const HARBORS_1112_PHASE = HARBORS_1112.phase;
export const HARBORS_1112_SCHEMA = HARBORS_1112.schema;
export const HARBORS_1112_MARKER = HARBORS_1112.harbors1112Marker;
export const HARBOR_COUNT_FLOOR_1112 = HARBORS_1112.harborCount;

export interface Harbors1112Measure {
  harborCount: number;
  newHarborsPresent: boolean;
  prestigePresent: boolean;
  questsPresent: boolean;
  galleriesPresent: boolean;
  blockoutsPresent: boolean;
  kickoffHarborMet: boolean;
  missingGates: string[];
  missingBlockouts: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureHarbors1112(repoRoot: string): Harbors1112Measure {
  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const content = loadContent(JSON.parse(readFileSync(packPath, "utf8")));

  const newHarborsPresent = HARBORS_1112.newHarbors.every((h) => content.harborsById.has(h.id));
  const prestigePresent = HARBORS_1112.circuitPrestige.every((id) =>
    content.prestigeMilestonesById.has(id),
  );
  const questsPresent = HARBORS_1112.newHarbors.every((h) => content.questsById.has(h.landingQuest));
  const galleriesPresent = HARBORS_1112.newHarbors.every((h) => content.trophySetsById.has(h.gallery));

  const missingBlockouts: string[] = [];
  for (const entry of HARBORS_1112.newHarbors) {
    if (!existsSync(resolve(repoRoot, entry.blockout))) missingBlockouts.push(entry.blockout);
  }

  let kickoffHarborMet = false;
  const kickoffPath = resolve(repoRoot, HARBORS_1112.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    kickoffHarborMet =
      (kickoff?.baseline?.authoredHarbors ?? 0) >= 12 &&
      (kickoff?.baseline?.harbors ?? 0) >= 12 &&
      (kickoff?.gaps?.authoredHarborsRemaining ?? 1) === 0 &&
      (kickoff?.gapTargets?.harborsMin ?? 0) >= 12;
  }

  const missingGates: string[] = [];
  for (const gate of HARBORS_1112.preflightGates) {
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
    missingGates,
    missingBlockouts,
  };
}
