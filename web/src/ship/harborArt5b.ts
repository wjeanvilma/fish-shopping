/**
 * Finish 5.0 Phase 8 — harbor art 5b (harbors 7–10 beyond blockout)
 * mirrors shared/ship/harbor-art-5b.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/harbor-art-5b.json";

export interface HarborArt5bEntry {
  harborId: string;
  theme: string;
  asset: string;
}

export interface HarborArt5bCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  harborArt5bMarker: string;
  harborFinish5Marker: string;
  harborArtPassCatalog: string;
  harborArtMarker: string;
  harborScenicMarker: string;
  cozyArtMarker: string;
  finish5HarborTarget: number;
  minHarborArtNodes: number;
  finish5Harbors: HarborArt5bEntry[];
  themesModule: string;
  generator: string;
  cozyThemeModule: string;
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: boolean;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const HARBOR_ART_5B = catalogJson as unknown as HarborArt5bCatalog;
export const HARBOR_ART_5B_PHASE = HARBOR_ART_5B.phase;
export const HARBOR_ART_5B_SCHEMA = HARBOR_ART_5B.schema;
export const HARBOR_ART_5B_MARKER = HARBOR_ART_5B.harborArt5bMarker;

export interface HarborArt5bMeasure {
  finish5Count: number;
  finish5Present: boolean;
  minArtNodesMet: boolean;
  artNodeCounts: Record<string, number>;
  authoredHarborsUnchanged: boolean;
  gapClosed: boolean;
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

export function measureHarborArt5b(repoRoot: string): HarborArt5bMeasure {
  const passPath = resolve(repoRoot, HARBOR_ART_5B.harborArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredHarbors: [] };
  const authored = (pass.authoredHarbors ?? []) as HarborArt5bEntry[];
  const authoredIds = new Set(authored.map((h) => h.harborId));

  const finish5Present = HARBOR_ART_5B.finish5Harbors.every((h) => authoredIds.has(h.harborId));
  let finish5Count = 0;
  const artNodeCounts: Record<string, number> = {};
  const missingAssets: string[] = [];
  let minArtNodesMet = true;

  for (const entry of HARBOR_ART_5B.finish5Harbors) {
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
      extras.harborFinish5 === HARBOR_ART_5B.harborFinish5Marker &&
      String(extras.envArt ?? "").includes(HARBOR_ART_5B.harborFinish5Marker) &&
      extras.harborScenic === HARBOR_ART_5B.harborScenicMarker &&
      String(extras.envArt ?? "").includes(HARBOR_ART_5B.harborScenicMarker) &&
      extras.cozyArt === HARBOR_ART_5B.cozyArtMarker;
    if (stamped) finish5Count += 1;
    if (artNodes.length < HARBOR_ART_5B.minHarborArtNodes) minArtNodesMet = false;
  }

  const kickoffPath = resolve(repoRoot, HARBOR_ART_5B.kickoffCatalog);
  const kickoff = existsSync(kickoffPath) ? readJson(kickoffPath) : {};
  const phase8 = (kickoff.phases as any[])?.find((p) => p.phase === 8);

  const missingGates: string[] = [];
  for (const gate of HARBOR_ART_5B.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    finish5Count,
    finish5Present,
    minArtNodesMet,
    artNodeCounts,
    // Soft-floored after Phase 14 closed harbors 11–12 (was 10 until Phase 14).
    authoredHarborsUnchanged: authored.length === 12,
    gapClosed: kickoff?.gaps?.[HARBOR_ART_5B.gapClosed] === HARBOR_ART_5B.gapClosedValue,
    kickoffWired:
      phase8?.id === "harbor-art-5b" && phase8?.validate === "harborart5b:validate",
    missingGates,
    missingAssets,
  };
}
