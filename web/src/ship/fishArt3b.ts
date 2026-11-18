/**
 * Finish 4.0 Phase 8 — fish mesh pass 3b (species 76–100)
 * (mirrors shared/ship/fish-art-3b.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/fish-art-3b.json";

export interface FishArt3bCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fishArt3bMarker: string;
  fishArtPassCatalog: string;
  fishArtMarker: string;
  authoredSpeciesTarget: number;
  priorAuthoredSpeciesFloor: number;
  newAuthoredCount: number;
  speciesRange: string;
  speciesCountTarget: number;
  themesModule: string;
  generator: string;
  authorTool: string;
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: number;
  baselineAuthoredFish: number;
  baselineSpecies: number;
  parityFixture: string;
  validateScript: string;
  newSpeciesIds: string[];
  checklist: string[];
  preflightGates: string[];
}

export const FISH_ART_3B = catalogJson as unknown as FishArt3bCatalog;
export const FISH_ART_3B_PHASE = FISH_ART_3B.phase;
export const FISH_ART_3B_SCHEMA = FISH_ART_3B.schema;
export const FISH_ART_3B_MARKER = FISH_ART_3B.fishArt3bMarker;

export interface FishArt3bMeasure {
  authoredCount: number;
  speciesCount: number;
  newAuthoredCount: number;
  wavePresent: boolean;
  gapClosed: boolean;
  speciesGapClosed: boolean;
  licensesOk: boolean;
  dodQuotaOk: boolean;
  missingGates: string[];
  missingAssets: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureFishArt3b(repoRoot: string): FishArt3bMeasure {
  const passPath = resolve(repoRoot, FISH_ART_3B.fishArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredSpecies: [] };
  const authored = (pass.authoredSpecies ?? []) as { speciesId: string; asset: string }[];
  const authoredIds = new Set(authored.map((s) => s.speciesId));
  const waveIds = FISH_ART_3B.newSpeciesIds;
  const newAuthoredCount = waveIds.filter((id) => authoredIds.has(id)).length;
  const wavePresent = newAuthoredCount === waveIds.length;

  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const pack = existsSync(packPath) ? readJson(packPath) : { species: [] };
  const speciesCount = (pack.species ?? []).length;

  let gapClosed = false;
  let speciesGapClosed = false;
  const kickoffPath = resolve(repoRoot, FISH_ART_3B.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed =
      kickoff?.gaps?.[FISH_ART_3B.gapClosed] === FISH_ART_3B.gapClosedValue &&
      kickoff?.baseline?.authoredFish === FISH_ART_3B.baselineAuthoredFish;
    speciesGapClosed =
      kickoff?.gaps?.speciesRemaining === 0 &&
      (kickoff?.baseline?.species ?? 0) >= FISH_ART_3B.baselineSpecies;
  }

  const licensesPath = resolve(repoRoot, "shared/store/licenses.json");
  let licensesOk = false;
  if (existsSync(licensesPath)) {
    const licenses = readJson(licensesPath);
    const record = (licenses.records ?? []).find((r: { id: string }) => r.id === "fish-authored-art");
    const paths = new Set((record?.paths ?? []) as string[]);
    licensesOk = authored.every((s) => paths.has(s.asset));
  }

  const dodPath = resolve(repoRoot, "shared/ship/definition-of-done.json");
  let dodQuotaOk = false;
  if (existsSync(dodPath)) {
    const dod = readJson(dodPath);
    dodQuotaOk =
      (dod.quotas?.authoredFishSpecies ?? 0) >= FISH_ART_3B.authoredSpeciesTarget &&
      (dod.quotas?.speciesMin ?? 0) >= FISH_ART_3B.speciesCountTarget;
  }

  const missingGates: string[] = [];
  for (const gate of FISH_ART_3B.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const missingAssets: string[] = [];
  for (const id of waveIds) {
    const short = id.split(".")[1];
    const asset = resolve(repoRoot, `shared/assets/models/fish_${short}.glb`);
    if (!existsSync(asset)) missingAssets.push(asset);
  }

  return {
    authoredCount: authored.length,
    speciesCount,
    newAuthoredCount,
    wavePresent,
    gapClosed,
    speciesGapClosed,
    licensesOk,
    dodQuotaOk,
    missingGates,
    missingAssets,
  };
}
