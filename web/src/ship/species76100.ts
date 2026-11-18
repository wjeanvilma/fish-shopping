/**
 * Finish 4.0 Phase 11 — species 76–100 + ecology + i18n
 * (mirrors shared/ship/species-76-100.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/species-76-100.json";
import { loadContent } from "../engine";

export interface Species76100BaseEntry {
  id: string;
  name: string;
  rareUpgrade: string | null;
  harbors: string[];
  gallery: string;
  habitat: string;
}

export interface Species76100Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  speciesCount: number;
  newSpeciesCount: number;
  habitatCount: number;
  newHabitatCount: number;
  species76100Marker: string;
  priorSpeciesFloor: number;
  newBaseSpecies: Species76100BaseEntry[];
  newRareSpecies: string[];
  habitatIds: string[];
  allHabitatFloor: number;
  rareGallery: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  schemaPrep: {
    targetSchemaVersion: number;
    status: string;
    ownedByPhase: number;
    prepCatalog: string;
  };
  i18n: {
    locales: string[];
    waveKeyCount: number;
    habitatKeyCount: number;
    requireTranslatedLocales: boolean;
  };
  checklist: string[];
  preflightGates: string[];
}

export const SPECIES_76100 = catalogJson as unknown as Species76100Catalog;
export const SPECIES_76100_PHASE = SPECIES_76100.phase;
export const SPECIES_76100_SCHEMA = SPECIES_76100.schema;
export const SPECIES_76100_MARKER = SPECIES_76100.species76100Marker;
export const SPECIES_76100_COUNT = SPECIES_76100.speciesCount;
export const HABITAT_FLOOR_76100 = SPECIES_76100.habitatCount;

export interface Species76100Measure {
  speciesCount: number;
  habitatCount: number;
  newBasesPresent: boolean;
  newRaresPresent: boolean;
  newHabitatsPresent: boolean;
  waveWeighted: boolean;
  i18nTranslated: boolean;
  schemaPrepOk: boolean;
  kickoffSpeciesMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureSpecies76100(repoRoot: string): Species76100Measure {
  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const content = loadContent(JSON.parse(readFileSync(packPath, "utf8")));

  const newBasesPresent = SPECIES_76100.newBaseSpecies.every((b) => content.speciesById.has(b.id));
  const newRaresPresent = SPECIES_76100.newRareSpecies.every((id) => content.speciesById.has(id));
  const habitatIds = new Set((content.ecology.habitats ?? []).map((h) => h.id));
  const newHabitatsPresent = SPECIES_76100.habitatIds.every((id) => habitatIds.has(id));

  const weighted = new Set<string>();
  for (const h of content.ecology.habitats ?? []) {
    for (const id of Object.keys(h.speciesWeightMultPermille ?? {})) weighted.add(id);
  }
  const waveIds = [
    ...SPECIES_76100.newBaseSpecies.map((b) => b.id),
    ...SPECIES_76100.newRareSpecies,
  ];
  const waveWeighted = waveIds.every((id) => weighted.has(id));

  let i18nTranslated = false;
  const enPath = resolve(repoRoot, SPECIES_76100.i18n.locales.includes("en")
    ? "shared/i18n/content-strings.en.json"
    : "shared/i18n/content-strings.en.json");
  const esPath = resolve(repoRoot, "shared/i18n/content-strings.es.json");
  const ptPath = resolve(repoRoot, "shared/i18n/content-strings.pt.json");
  if (existsSync(enPath) && existsSync(esPath) && existsSync(ptPath)) {
    const en = readJson(enPath).strings ?? {};
    const es = readJson(esPath).strings ?? {};
    const pt = readJson(ptPath).strings ?? {};
    let ok = true;
    for (const id of waveIds) {
      if (!en[id] || !es[id] || !pt[id]) {
        ok = false;
        break;
      }
      if (es[id] === en[id] || pt[id] === en[id]) {
        ok = false;
        break;
      }
    }
    for (const hid of SPECIES_76100.habitatIds) {
      if (!en[hid] || !es[hid] || !pt[hid]) {
        ok = false;
        break;
      }
      if (es[hid] === en[hid] || pt[hid] === en[hid]) {
        ok = false;
        break;
      }
    }
    i18nTranslated = ok;
  }

  let schemaPrepOk = false;
  const prepPath = resolve(repoRoot, SPECIES_76100.schemaPrep.prepCatalog);
  if (existsSync(prepPath)) {
    const prep = readJson(prepPath);
    schemaPrepOk =
      prep.targetSchemaVersion === SPECIES_76100.schemaPrep.targetSchemaVersion &&
      prep.currentSchemaVersion >= 24 &&
      (prep.status === "prepared" || prep.status === "applied") &&
      prep.ownedByPhase === SPECIES_76100.schemaPrep.ownedByPhase;
  }

  let kickoffSpeciesMet = false;
  const kickoffPath = resolve(repoRoot, SPECIES_76100.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    kickoffSpeciesMet =
      (kickoff?.baseline?.species ?? 0) >= 100 &&
      (kickoff?.gaps?.speciesRemaining ?? 1) === 0 &&
      (kickoff?.gapTargets?.speciesMin ?? 0) >= 100;
  }

  const missingGates: string[] = [];
  for (const gate of SPECIES_76100.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    speciesCount: content.species.length,
    habitatCount: (content.ecology.habitats ?? []).length,
    newBasesPresent,
    newRaresPresent,
    newHabitatsPresent,
    waveWeighted,
    i18nTranslated,
    schemaPrepOk,
    kickoffSpeciesMet,
    missingGates,
  };
}
