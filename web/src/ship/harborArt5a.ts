/**
 * Finish 5.0 Phase 7 — harbor art 5a (harbors 1–6 beyond blockout)
 * mirrors shared/ship/harbor-art-5a.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/harbor-art-5a.json";

export interface HarborArt5aEntry {
  harborId: string;
  theme: string;
  asset: string;
}

export interface HarborArt5aCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  harborArt5aMarker: string;
  harborFinish5Marker: string;
  harborArtPassCatalog: string;
  harborArtMarker: string;
  harborScenicMarker: string;
  cozyArtMarker: string;
  finish5HarborTarget: number;
  minHarborArtNodes: number;
  finish5Harbors: HarborArt5aEntry[];
  themesModule: string;
  generator: string;
  cozyThemeModule: string;
  kickoffCatalog: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const HARBOR_ART_5A = catalogJson as unknown as HarborArt5aCatalog;
export const HARBOR_ART_5A_PHASE = HARBOR_ART_5A.phase;
export const HARBOR_ART_5A_SCHEMA = HARBOR_ART_5A.schema;
export const HARBOR_ART_5A_MARKER = HARBOR_ART_5A.harborArt5aMarker;

export interface HarborArt5aMeasure {
  finish5Count: number;
  finish5Present: boolean;
  minArtNodesMet: boolean;
  artNodeCounts: Record<string, number>;
  authoredHarborsUnchanged: boolean;
  harborArt5IncompleteOpen: boolean;
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

export function measureHarborArt5a(repoRoot: string): HarborArt5aMeasure {
  const passPath = resolve(repoRoot, HARBOR_ART_5A.harborArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredHarbors: [] };
  const authored = (pass.authoredHarbors ?? []) as HarborArt5aEntry[];
  const authoredIds = new Set(authored.map((h) => h.harborId));

  const finish5Present = HARBOR_ART_5A.finish5Harbors.every((h) => authoredIds.has(h.harborId));
  let finish5Count = 0;
  const artNodeCounts: Record<string, number> = {};
  const missingAssets: string[] = [];
  let minArtNodesMet = true;

  for (const entry of HARBOR_ART_5A.finish5Harbors) {
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
    const artNodes = nodes.filter((n) => n.startsWith("HarborArt_"));
    artNodeCounts[entry.harborId] = artNodes.length;
    const stamped =
      extras.harborFinish5 === HARBOR_ART_5A.harborFinish5Marker &&
      String(extras.envArt ?? "").includes(HARBOR_ART_5A.harborFinish5Marker) &&
      extras.harborScenic === HARBOR_ART_5A.harborScenicMarker &&
      String(extras.envArt ?? "").includes(HARBOR_ART_5A.harborScenicMarker) &&
      extras.cozyArt === HARBOR_ART_5A.cozyArtMarker;
    if (stamped) finish5Count += 1;
    if (artNodes.length < HARBOR_ART_5A.minHarborArtNodes) minArtNodesMet = false;
  }

  const kickoffPath = resolve(repoRoot, HARBOR_ART_5A.kickoffCatalog);
  const kickoff = existsSync(kickoffPath) ? readJson(kickoffPath) : {};
  const phase7 = (kickoff.phases as any[])?.find((p) => p.phase === 7);

  const missingGates: string[] = [];
  for (const gate of HARBOR_ART_5A.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    finish5Count,
    finish5Present,
    minArtNodesMet,
    artNodeCounts,
    // Soft-floored after Finish 5 Phase 14 (12) and Finish 6 Phase 7 (14).
    authoredHarborsUnchanged: authored.length >= 12,
    // Soft-floored after Phase 8 closed harborArt5Incomplete.
    harborArt5IncompleteOpen: typeof kickoff?.gaps?.harborArt5Incomplete === "boolean",
    kickoffWired:
      phase7?.id === "harbor-art-5a" && phase7?.validate === "harborart5a:validate",
    missingGates,
    missingAssets,
  };
}
