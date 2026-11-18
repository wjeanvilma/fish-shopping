/**
 * Finish 4.0 Phase 12 — harbors 9–10 catalog
 * (mirrors shared/ship/harbors-9-10.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import harborsJson from "../../../shared/ship/harbors-9-10.json";
import { loadContent } from "../engine";

export interface Harbor910Entry {
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

export interface Harbors910Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  harborCount: number;
  newHarborCount: number;
  harbors910Marker: string;
  newHarbors: Harbor910Entry[];
  circuitPrestige: string[];
  travelFixture: string;
  definitionOfDoneQuota: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const HARBORS_910 = harborsJson as unknown as Harbors910Catalog;
export const HARBORS_910_PHASE = HARBORS_910.phase;
export const HARBORS_910_SCHEMA = HARBORS_910.schema;
export const HARBORS_910_MARKER = HARBORS_910.harbors910Marker;
export const HARBOR_COUNT_FLOOR_910 = HARBORS_910.harborCount;

export interface Harbors910Measure {
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

export function measureHarbors910(repoRoot: string): Harbors910Measure {
  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const content = loadContent(JSON.parse(readFileSync(packPath, "utf8")));

  const newHarborsPresent = HARBORS_910.newHarbors.every((h) => content.harborsById.has(h.id));
  const prestigePresent = HARBORS_910.circuitPrestige.every((id) =>
    content.prestigeMilestonesById.has(id),
  );
  const questsPresent = HARBORS_910.newHarbors.every((h) => content.questsById.has(h.landingQuest));
  const galleriesPresent = HARBORS_910.newHarbors.every((h) => content.trophySetsById.has(h.gallery));

  const missingBlockouts: string[] = [];
  for (const entry of HARBORS_910.newHarbors) {
    if (!existsSync(resolve(repoRoot, entry.blockout))) missingBlockouts.push(entry.blockout);
  }

  let kickoffHarborMet = false;
  const kickoffPath = resolve(repoRoot, HARBORS_910.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    kickoffHarborMet =
      (kickoff?.baseline?.authoredHarbors ?? 0) >= 10 &&
      (kickoff?.baseline?.harbors ?? 0) >= 10 &&
      (kickoff?.gaps?.authoredHarborsRemaining ?? 1) === 0 &&
      (kickoff?.gapTargets?.harborsMin ?? 0) >= 10;
  }

  const missingGates: string[] = [];
  for (const gate of HARBORS_910.preflightGates) {
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
