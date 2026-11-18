/**
 * Finish 4.0 Phase 7 — fish mesh pass 3a (species 51–75)
 * (mirrors shared/ship/fish-art-3a.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/fish-art-3a.json";

export interface FishArt3aCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fishArt3aMarker: string;
  fishArtPassCatalog: string;
  fishArtMarker: string;
  authoredSpeciesTarget: number;
  priorAuthoredSpeciesFloor: number;
  newAuthoredCount: number;
  speciesRange: string;
  themesModule: string;
  generator: string;
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: number;
  baselineAuthoredFish: number;
  parityFixture: string;
  validateScript: string;
  newSpeciesIds: string[];
  checklist: string[];
  preflightGates: string[];
}

export const FISH_ART_3A = catalogJson as unknown as FishArt3aCatalog;
export const FISH_ART_3A_PHASE = FISH_ART_3A.phase;
export const FISH_ART_3A_SCHEMA = FISH_ART_3A.schema;
export const FISH_ART_3A_MARKER = FISH_ART_3A.fishArt3aMarker;

export interface FishArt3aMeasure {
  authoredCount: number;
  newAuthoredCount: number;
  wavePresent: boolean;
  gapClosed: boolean;
  licensesOk: boolean;
  dodQuotaOk: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureFishArt3a(repoRoot: string): FishArt3aMeasure {
  const passPath = resolve(repoRoot, FISH_ART_3A.fishArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredSpecies: [] };
  const authored = (pass.authoredSpecies ?? []) as { speciesId: string; asset: string }[];
  const authoredIds = new Set(authored.map((s) => s.speciesId));
  const waveIds = FISH_ART_3A.newSpeciesIds;
  const newAuthoredCount = waveIds.filter((id) => authoredIds.has(id)).length;
  const wavePresent = newAuthoredCount === waveIds.length;

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, FISH_ART_3A.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    const remaining = kickoff?.gaps?.[FISH_ART_3A.gapClosed];
    const baseline = kickoff?.baseline?.authoredFish ?? 0;
    // Phase 7 closed at 75/25; later phases may raise baseline and shrink remaining further.
    gapClosed =
      typeof remaining === "number" &&
      remaining <= FISH_ART_3A.gapClosedValue &&
      baseline >= FISH_ART_3A.baselineAuthoredFish;
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
    dodQuotaOk = (dod.quotas?.authoredFishSpecies ?? 0) >= FISH_ART_3A.authoredSpeciesTarget;
  }

  const missingGates: string[] = [];
  for (const gate of FISH_ART_3A.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    authoredCount: authored.length,
    newAuthoredCount,
    wavePresent,
    gapClosed,
    licensesOk,
    dodQuotaOk,
    missingGates,
  };
}
