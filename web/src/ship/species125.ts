/**
 * Finish 5.0 Phase 13 — species 101–125 + ecology + i18n
 * (mirrors shared/ship/species-125.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/species-125.json";
import { loadContent } from "../engine";

export interface Species125BaseEntry {
  id: string;
  name: string;
  rareUpgrade: string | null;
  harbors: string[];
  gallery: string;
  habitat: string;
}

export interface Species125Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  speciesCount: number;
  newSpeciesCount: number;
  habitatCount: number;
  newHabitatCount: number;
  species125Marker: string;
  priorSpeciesFloor: number;
  gapClosed: string;
  gapClosedValue: number;
  newBaseSpecies: Species125BaseEntry[];
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

export const SPECIES_125 = catalogJson as unknown as Species125Catalog;
export const SPECIES_125_PHASE = SPECIES_125.phase;
export const SPECIES_125_SCHEMA = SPECIES_125.schema;
export const SPECIES_125_MARKER = SPECIES_125.species125Marker;
export const SPECIES_125_COUNT = SPECIES_125.speciesCount;
export const HABITAT_FLOOR_125 = SPECIES_125.habitatCount;

export interface Species125Measure {
  speciesCount: number;
  habitatCount: number;
  newBasesPresent: boolean;
  newRaresPresent: boolean;
  newHabitatsPresent: boolean;
  waveWeighted: boolean;
  i18nTranslated: boolean;
  kickoffSpeciesMet: boolean;
  gapClosed: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureSpecies125(repoRoot: string): Species125Measure {
  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const content = loadContent(JSON.parse(readFileSync(packPath, "utf8")));

  const newBasesPresent = SPECIES_125.newBaseSpecies.every((b) => content.speciesById.has(b.id));
  const newRaresPresent = SPECIES_125.newRareSpecies.every((id) => content.speciesById.has(id));
  const habitatIds = new Set((content.ecology.habitats ?? []).map((h) => h.id));
  const newHabitatsPresent = SPECIES_125.habitatIds.every((id) => habitatIds.has(id));

  const weighted = new Set<string>();
  for (const h of content.ecology.habitats ?? []) {
    for (const id of Object.keys(h.speciesWeightMultPermille ?? {})) weighted.add(id);
  }
  const waveIds = [
    ...SPECIES_125.newBaseSpecies.map((b) => b.id),
    ...SPECIES_125.newRareSpecies,
  ];
  const waveWeighted = waveIds.every((id) => weighted.has(id));

  let i18nTranslated = true;
  const enPath = resolve(repoRoot, "shared/i18n/content-strings.en.json");
  if (!existsSync(enPath)) i18nTranslated = false;
  else {
    const en = readJson(enPath).strings ?? {};
    for (const id of [...waveIds, ...SPECIES_125.habitatIds]) {
      if (!en[id]) {
        i18nTranslated = false;
        break;
      }
    }
    for (const loc of SPECIES_125.i18n.requireNonEnglishPassthrough) {
      const locPath = resolve(repoRoot, `shared/i18n/content-strings.${loc}.json`);
      if (!existsSync(locPath)) {
        i18nTranslated = false;
        break;
      }
      const strings = readJson(locPath).strings ?? {};
      for (const id of [...waveIds, ...SPECIES_125.habitatIds]) {
        if (!strings[id] || strings[id] === en[id]) {
          i18nTranslated = false;
          break;
        }
      }
      if (!i18nTranslated) break;
    }
  }

  const kickoffPath = resolve(repoRoot, SPECIES_125.kickoffCatalog);
  const kickoff = existsSync(kickoffPath) ? readJson(kickoffPath) : {};
  const phase13 = (kickoff.phases as any[])?.find((p) => p.phase === 13);
  const kickoffSpeciesMet =
    (kickoff.baseline?.species ?? 0) >= 125 && kickoff.gaps?.speciesRemaining === 0;
  const gapClosed = kickoff.gaps?.[SPECIES_125.gapClosed] === SPECIES_125.gapClosedValue;

  const missingGates: string[] = [];
  for (const gate of SPECIES_125.preflightGates) {
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
    kickoffSpeciesMet,
    gapClosed,
    missingGates,
  };
}

export function waveSpeciesIds(): string[] {
  return [
    ...SPECIES_125.newBaseSpecies.map((b) => b.id),
    ...SPECIES_125.newRareSpecies,
  ];
}
