/**
 * Finish 3.0 Phase 12 — species 51–75 + ecology
 * (mirrors shared/ship/species-51-75.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/species-51-75.json";
import { loadContent } from "../engine";

export interface Species5175BaseEntry {
  id: string;
  name: string;
  rareUpgrade: string | null;
  harbors: string[];
  gallery: string;
  habitat: string;
}

export interface Species5175Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  speciesCount: number;
  newSpeciesCount: number;
  habitatCount: number;
  species51_75Marker: string;
  newBaseSpecies: Species5175BaseEntry[];
  newRareSpecies: string[];
  habitatIds: string[];
  rareGallery: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const SPECIES_5175 = catalogJson as unknown as Species5175Catalog;
export const SPECIES_5175_PHASE = SPECIES_5175.phase;
export const SPECIES_5175_SCHEMA = SPECIES_5175.schema;
export const SPECIES_5175_MARKER = SPECIES_5175.species51_75Marker;
export const SPECIES_5175_COUNT = SPECIES_5175.speciesCount;
export const HABITAT_COUNT_FLOOR = SPECIES_5175.habitatCount;

export interface Species5175Measure {
  speciesCount: number;
  habitatCount: number;
  newBasesPresent: boolean;
  newRaresPresent: boolean;
  habitatsPresent: boolean;
  spotsWired: boolean;
  galleriesWired: boolean;
  codexComplete: boolean;
  assetsPresent: boolean;
  kickoffSpeciesMet: boolean;
  missingGates: string[];
  missingAssets: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureSpecies5175(repoRoot: string): Species5175Measure {
  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const pack = readJson(packPath);
  const content = loadContent(pack);

  const habitatIds = new Set((content.ecology.habitats ?? []).map((h) => h.id));
  const habitatsPresent = SPECIES_5175.habitatIds.every((id) => habitatIds.has(id));

  let spotsWired = true;
  let galleriesWired = true;
  for (const entry of SPECIES_5175.newBaseSpecies) {
    if (!content.speciesById.has(entry.id)) {
      spotsWired = false;
      continue;
    }
    const gallery = content.trophySetsById.get(entry.gallery);
    if (!gallery?.species.includes(entry.id)) galleriesWired = false;
    for (const harborId of entry.harbors) {
      const harbor = content.harborsById.get(harborId);
      if (!harbor?.fishingSpots.some((s) => s.species.includes(entry.id))) {
        spotsWired = false;
      }
    }
  }

  const newBasesPresent = SPECIES_5175.newBaseSpecies.every((b) => content.speciesById.has(b.id));
  const newRaresPresent = SPECIES_5175.newRareSpecies.every((id) => {
    const rareSet = content.trophySetsById.get(SPECIES_5175.rareGallery);
    return content.speciesById.has(id) && !!rareSet?.species.includes(id);
  });

  const codexComplete =
    content.codex.entries.length === content.species.length &&
    content.species.every((s) => content.codexBySpeciesId.has(s.id));

  const missingAssets: string[] = [];
  for (const entry of SPECIES_5175.newBaseSpecies) {
    const sp = content.speciesById.get(entry.id);
    if (sp && !existsSync(resolve(repoRoot, "shared/assets", sp.asset))) {
      missingAssets.push(sp.asset);
    }
    if (entry.rareUpgrade) {
      const rare = content.speciesById.get(entry.rareUpgrade);
      if (rare && !existsSync(resolve(repoRoot, "shared/assets", rare.asset))) {
        missingAssets.push(rare.asset);
      }
    }
  }

  let kickoffSpeciesMet = false;
  const kickoffPath = resolve(repoRoot, SPECIES_5175.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    kickoffSpeciesMet =
      (kickoff?.baseline?.species ?? 0) >= 75 &&
      (kickoff?.gapTargets?.speciesMin ?? 0) === 75 &&
      (kickoff?.baseline?.measuredAtPhase ?? 0) >= 12;
  }

  const missingGates: string[] = [];
  for (const gate of SPECIES_5175.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    speciesCount: content.species.length,
    habitatCount: (content.ecology.habitats ?? []).length,
    newBasesPresent,
    newRaresPresent,
    habitatsPresent,
    spotsWired,
    galleriesWired,
    codexComplete,
    assetsPresent: missingAssets.length === 0,
    kickoffSpeciesMet,
    missingGates,
    missingAssets,
  };
}
