/**
 * Finish 6.0 Phase 8 — species 126–150 + ecology + i18n + fish-art-6
 * (mirrors shared/ship/species-150.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/species-150.json";
import { loadContent } from "../engine";

export interface Species150BaseEntry {
  id: string;
  name: string;
  rareUpgrade: string | null;
  harbors: string[];
  gallery: string;
  habitat: string;
}

export interface Species150Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  speciesCount: number;
  newSpeciesCount: number;
  habitatCount: number;
  newHabitatCount: number;
  species150Marker: string;
  priorSpeciesFloor: number;
  fishArtMarker: string;
  gapsClosed: string[];
  newBaseSpecies: Species150BaseEntry[];
  newRareSpecies: string[];
  habitatIds: string[];
  allHabitatFloor: number;
  rareGallery: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  i18n: {
    locales: string[];
    waveKeyCount: number;
    habitatKeyCount: number;
    requireTranslatedLocales: boolean;
    requireNonEnglishPassthrough: string[];
  };
  checklist: string[];
  preflightGates: string[];
}

export const SPECIES_150 = catalogJson as unknown as Species150Catalog;
export const SPECIES_150_PHASE = SPECIES_150.phase;
export const SPECIES_150_SCHEMA = SPECIES_150.schema;
export const SPECIES_150_MARKER = SPECIES_150.species150Marker;
export const SPECIES_150_COUNT = SPECIES_150.speciesCount;
export const HABITAT_FLOOR_150 = SPECIES_150.allHabitatFloor;

export interface Species150Measure {
  speciesCount: number;
  habitatCount: number;
  newBasesPresent: boolean;
  newRaresPresent: boolean;
  newHabitatsPresent: boolean;
  waveWeighted: boolean;
  i18nTranslated: boolean;
  fishArtMet: boolean;
  kickoffGapsClosed: boolean;
  missingGates: string[];
  missingFishAssets: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function waveSpeciesIds(): string[] {
  return [...SPECIES_150.newBaseSpecies.map((b) => b.id), ...SPECIES_150.newRareSpecies];
}

export function measureSpecies150(repoRoot: string): Species150Measure {
  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const content = loadContent(JSON.parse(readFileSync(packPath, "utf8")));

  const newBasesPresent = SPECIES_150.newBaseSpecies.every((b) => content.speciesById.has(b.id));
  const newRaresPresent = SPECIES_150.newRareSpecies.every((id) => content.speciesById.has(id));
  const habitatIds = new Set((content.ecology.habitats ?? []).map((h) => h.id));
  const newHabitatsPresent = SPECIES_150.habitatIds.every((id) => habitatIds.has(id));

  const weighted = new Set<string>();
  for (const h of content.ecology.habitats ?? []) {
    for (const id of Object.keys(h.speciesWeightMultPermille ?? {})) weighted.add(id);
  }
  const waveIds = waveSpeciesIds();
  const waveWeighted = waveIds.every((id) => weighted.has(id));

  let i18nTranslated = true;
  const enPath = resolve(repoRoot, "shared/i18n/content-strings.en.json");
  if (!existsSync(enPath)) i18nTranslated = false;
  else {
    const en = readJson(enPath).strings ?? {};
    for (const id of [...waveIds, ...SPECIES_150.habitatIds]) {
      if (!en[id]) {
        i18nTranslated = false;
        break;
      }
    }
    for (const loc of SPECIES_150.i18n.requireNonEnglishPassthrough) {
      const locPath = resolve(repoRoot, `shared/i18n/content-strings.${loc}.json`);
      if (!existsSync(locPath)) {
        i18nTranslated = false;
        break;
      }
      const strings = readJson(locPath).strings ?? {};
      for (const id of [...waveIds, ...SPECIES_150.habitatIds]) {
        if (!strings[id] || strings[id] === en[id]) {
          i18nTranslated = false;
          break;
        }
      }
      if (!i18nTranslated) break;
    }
  }

  const artPath = resolve(repoRoot, "shared/ship/fish-art-pass.json");
  const art = existsSync(artPath) ? readJson(artPath) : { authoredSpecies: [] };
  const artIds = new Set((art.authoredSpecies ?? []).map((e: any) => e.speciesId));
  const missingFishAssets: string[] = [];
  for (const id of waveIds) {
    const short = id.split(".", 2)[1];
    const asset = resolve(repoRoot, `shared/assets/models/fish_${short}.glb`);
    if (!existsSync(asset)) missingFishAssets.push(asset);
    if (!artIds.has(id)) missingFishAssets.push(`fish-art-pass missing ${id}`);
  }

  const kickoffPath = resolve(repoRoot, SPECIES_150.kickoffCatalog);
  const kickoff = existsSync(kickoffPath) ? readJson(kickoffPath) : {};
  const kickoffGapsClosed =
    (kickoff.baseline?.species ?? 0) === 125 &&
    (kickoff.baseline?.authoredFish ?? 0) === 125 &&
    kickoff.gaps?.speciesRemaining === 0 &&
    kickoff.gaps?.authoredFishRemaining === 0 &&
    kickoff.gaps?.fishArt6Incomplete === false &&
    (kickoff.gapTargets?.speciesMin ?? 0) >= 150;

  const missingGates: string[] = [];
  for (const gate of SPECIES_150.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    speciesCount: content.species.length,
    habitatCount: content.ecology.habitats?.length ?? 0,
    newBasesPresent,
    newRaresPresent,
    newHabitatsPresent,
    waveWeighted,
    i18nTranslated,
    fishArtMet: missingFishAssets.length === 0 && (art.authoredSpeciesMin ?? 0) >= 150,
    kickoffGapsClosed,
    missingGates,
    missingFishAssets,
  };
}
