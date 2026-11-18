/**
 * Finish 3.0 Phase 9 — fish mesh pass 2
 * (mirrors shared/ship/fish-art-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/fish-art-2.json";

export interface FishArt2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fishArt2Marker: string;
  fishArtPassCatalog: string;
  fishArtMarker: string;
  authoredSpeciesTarget: number;
  priorAuthoredSpeciesFloor: number;
  newAuthoredCount: number;
  themesModule: string;
  generator: string;
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: number;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const FISH_ART_2 = catalogJson as unknown as FishArt2Catalog;
export const FISH_ART_2_PHASE = FISH_ART_2.phase;
export const FISH_ART_2_SCHEMA = FISH_ART_2.schema;
export const FISH_ART_2_MARKER = FISH_ART_2.fishArt2Marker;

export interface FishArt2Measure {
  authoredCount: number;
  newAuthoredCount: number;
  gapClosed: boolean;
  licensesOk: boolean;
  dodQuotaOk: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

const PRIOR_IDS = new Set([
  "species.dawn_anchovy",
  "species.silver_sprat",
  "species.harbor_herring",
  "species.sail_needlefish",
  "species.blue_mackerel",
  "species.copper_mullet",
  "species.tide_bass",
  "species.amber_snapper",
  "species.king_grouper",
  "species.reef_perch",
]);

export function measureFishArt2(repoRoot: string): FishArt2Measure {
  const passPath = resolve(repoRoot, FISH_ART_2.fishArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredSpecies: [] };
  const authored = (pass.authoredSpecies ?? []) as { speciesId: string; asset: string }[];
  const newAuthoredCount = authored.filter((s) => !PRIOR_IDS.has(s.speciesId)).length;

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, FISH_ART_2.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.[FISH_ART_2.gapClosed] === FISH_ART_2.gapClosedValue;
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
    dodQuotaOk = (dod.quotas?.authoredFishSpecies ?? 0) >= FISH_ART_2.authoredSpeciesTarget;
  }

  const missingGates: string[] = [];
  for (const gate of FISH_ART_2.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    authoredCount: authored.length,
    newAuthoredCount,
    gapClosed,
    licensesOk,
    dodQuotaOk,
    missingGates,
  };
}
