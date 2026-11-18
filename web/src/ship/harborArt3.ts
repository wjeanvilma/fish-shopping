/**
 * Finish 4.0 Phase 9 — harbor art scenic pass beyond blockout
 * (mirrors shared/ship/harbor-art-3.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/harbor-art-3.json";

export interface HarborArt3Entry {
  harborId: string;
  theme: string;
  asset: string;
}

export interface HarborArt3Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  harborArt3Marker: string;
  harborArtPassCatalog: string;
  harborArtMarker: string;
  harborScenicMarker: string;
  authoredHarborTarget: number;
  scenicHarborTarget: number;
  minHarborArtNodes: number;
  scenicHarbors: HarborArt3Entry[];
  themesModule: string;
  generator: string;
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: boolean;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const HARBOR_ART_3 = catalogJson as unknown as HarborArt3Catalog;
export const HARBOR_ART_3_PHASE = HARBOR_ART_3.phase;
export const HARBOR_ART_3_SCHEMA = HARBOR_ART_3.schema;
export const HARBOR_ART_3_MARKER = HARBOR_ART_3.harborArt3Marker;

export interface HarborArt3Measure {
  authoredCount: number;
  scenicCount: number;
  scenicPresent: boolean;
  minArtNodesMet: boolean;
  artNodeCounts: Record<string, number>;
  gapClosed: boolean;
  licensesOk: boolean;
  dodQuotaOk: boolean;
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

export function measureHarborArt3(repoRoot: string): HarborArt3Measure {
  const passPath = resolve(repoRoot, HARBOR_ART_3.harborArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredHarbors: [] };
  const authored = (pass.authoredHarbors ?? []) as HarborArt3Entry[];
  const authoredIds = new Set(authored.map((h) => h.harborId));

  const scenicPresent = HARBOR_ART_3.scenicHarbors.every((h) => authoredIds.has(h.harborId));
  let scenicCount = 0;
  const artNodeCounts: Record<string, number> = {};
  const missingAssets: string[] = [];
  let minArtNodesMet = true;

  for (const entry of HARBOR_ART_3.scenicHarbors) {
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
    const scenicOk =
      extras.harborArt === HARBOR_ART_3.harborArtMarker &&
      extras.harborScenic === HARBOR_ART_3.harborScenicMarker &&
      String(extras.envArt ?? "").includes(HARBOR_ART_3.harborScenicMarker);
    if (scenicOk) scenicCount += 1;
    if (artNodes.length < HARBOR_ART_3.minHarborArtNodes) minArtNodesMet = false;
  }

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, HARBOR_ART_3.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed =
      kickoff?.gaps?.[HARBOR_ART_3.gapClosed] === HARBOR_ART_3.gapClosedValue &&
      (kickoff?.baseline?.harborBlockouts ?? 99) === 0;
  }

  const licensesPath = resolve(repoRoot, "shared/store/licenses.json");
  let licensesOk = false;
  if (existsSync(licensesPath)) {
    const licenses = readJson(licensesPath);
    const record = (licenses.records ?? []).find((r: { id: string }) => r.id === "harbor-authored-art");
    const paths = new Set((record?.paths ?? []) as string[]);
    licensesOk = authored.every((h) => paths.has(h.asset));
  }

  const dodPath = resolve(repoRoot, "shared/ship/definition-of-done.json");
  let dodQuotaOk = false;
  if (existsSync(dodPath)) {
    const dod = readJson(dodPath);
    dodQuotaOk = (dod.quotas?.authoredHarborScenes ?? 0) >= HARBOR_ART_3.authoredHarborTarget;
  }

  const missingGates: string[] = [];
  for (const gate of HARBOR_ART_3.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    authoredCount: authored.length,
    scenicCount,
    scenicPresent,
    minArtNodesMet,
    artNodeCounts,
    gapClosed,
    licensesOk,
    dodQuotaOk,
    missingGates,
    missingAssets,
  };
}
