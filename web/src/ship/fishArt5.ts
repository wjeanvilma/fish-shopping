/**
 * Finish 5.0 Phase 9 — fish art 5 (species 101–125 meshes)
 * mirrors shared/ship/fish-art-5.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/fish-art-5.json";

export interface FishArt5Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fishArt5Marker: string;
  fishFinish5Marker: string;
  fishArtPassCatalog: string;
  fishArtMarker: string;
  authoredSpeciesTarget: number;
  priorAuthoredSpeciesFloor: number;
  newAuthoredCount: number;
  speciesRange: string;
  newSpeciesIds: string[];
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: boolean;
  baselineAuthoredFish: number;
  authoredFishRemainingClosed: number;
  speciesRemainingStillOpen: number;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const FISH_ART_5 = catalogJson as unknown as FishArt5Catalog;
export const FISH_ART_5_PHASE = FISH_ART_5.phase;
export const FISH_ART_5_SCHEMA = FISH_ART_5.schema;
export const FISH_ART_5_MARKER = FISH_ART_5.fishArt5Marker;

export interface FishArt5Measure {
  authoredCount: number;
  newStampedCount: number;
  minArtNodesMet: boolean;
  gapClosed: boolean;
  authoredFishRemainingClosed: boolean;
  speciesRemainingOpen: boolean;
  kickoffWired: boolean;
  missingGates: string[];
  missingAssets: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseGlbJson(buf: Buffer): Record<string, unknown> {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
  const chunkLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error("missing JSON chunk");
  return JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8").replace(/\0+$/, ""));
}

export function measureFishArt5(repoRoot: string): FishArt5Measure {
  const passPath = resolve(repoRoot, FISH_ART_5.fishArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredSpecies: [] };
  const authored = (pass.authoredSpecies ?? []) as { speciesId: string; asset: string }[];
  const byId = new Map(authored.map((e) => [e.speciesId, e]));

  let newStampedCount = 0;
  const missingAssets: string[] = [];
  let minArtNodesMet = true;

  for (const sid of FISH_ART_5.newSpeciesIds) {
    const entry = byId.get(sid);
    if (!entry) {
      missingAssets.push(sid);
      minArtNodesMet = false;
      continue;
    }
    const assetPath = resolve(repoRoot, entry.asset);
    if (!existsSync(assetPath)) {
      missingAssets.push(entry.asset);
      minArtNodesMet = false;
      continue;
    }
    const buf = readFileSync(assetPath);
    let gltf: Record<string, unknown>;
    try {
      gltf = parseGlbJson(buf);
    } catch {
      missingAssets.push(entry.asset);
      minArtNodesMet = false;
      continue;
    }
    const extras = (gltf.extras ?? {}) as Record<string, string>;
    const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
    const artNodes = nodes.filter((n) => n.startsWith("FishArt_"));
    const stamped =
      extras.fishFinish5 === FISH_ART_5.fishFinish5Marker &&
      extras.fishArt === FISH_ART_5.fishArtMarker;
    if (stamped) newStampedCount += 1;
    if (artNodes.length < 6) minArtNodesMet = false;
  }

  const kickoffPath = resolve(repoRoot, FISH_ART_5.kickoffCatalog);
  const kickoff = existsSync(kickoffPath) ? readJson(kickoffPath) : {};
  const phase9 = (kickoff.phases as any[])?.find((p) => p.phase === 9);

  const missingGates: string[] = [];
  for (const gate of FISH_ART_5.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    authoredCount: authored.length,
    newStampedCount,
    minArtNodesMet,
    gapClosed: kickoff?.gaps?.[FISH_ART_5.gapClosed] === FISH_ART_5.gapClosedValue,
    authoredFishRemainingClosed: kickoff?.gaps?.authoredFishRemaining === 0,
    // Phase 9 art-ahead left content open at 25; Phase 13 closes to 0.
    speciesRemainingOpen:
      kickoff?.gaps?.speciesRemaining === 25 || kickoff?.gaps?.speciesRemaining === 0,
    kickoffWired: phase9?.id === "fish-art-5" && phase9?.validate === "fishart5:validate",
    missingGates,
    missingAssets,
  };
}
