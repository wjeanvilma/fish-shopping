/**
 * Finish 5.0 Phase 11 — atmosphere/cozy render depth 5
 * mirrors shared/ship/atmosphere-5.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/atmosphere-5.json";
import { atmosphereFrame } from "../render/atmosphere";

export interface Atmosphere5Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  atmosphere5Marker: string;
  atmosphereFinish5Marker: string;
  cozyArtMarker: string;
  harborScenicMarker: string;
  harborArtPassCatalog: string;
  finish5HarborTarget: number;
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: boolean;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  renderModules: string[];
  requiredSockets: string[];
  requiredSocketPrefixes: string[];
  checklist: string[];
  preflightGates: string[];
}

export const ATMOSPHERE_5 = catalogJson as unknown as Atmosphere5Catalog;
export const ATMOSPHERE_5_PHASE = ATMOSPHERE_5.phase;
export const ATMOSPHERE_5_SCHEMA = ATMOSPHERE_5.schema;
export const ATMOSPHERE_5_MARKER = ATMOSPHERE_5.atmosphere5Marker;

export interface Atmosphere5Measure {
  harborCount: number;
  stampedCount: number;
  socketsOk: boolean;
  renderModulesPresent: boolean;
  atmosphereSamplesOk: boolean;
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

export function measureAtmosphere5(repoRoot: string): Atmosphere5Measure {
  const passPath = resolve(repoRoot, ATMOSPHERE_5.harborArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredHarbors: [] };
  const harbors = (pass.authoredHarbors ?? []) as { harborId: string; asset: string }[];

  let stampedCount = 0;
  let socketsOk = true;
  const missingAssets: string[] = [];

  for (const entry of harbors) {
    const assetPath = resolve(repoRoot, entry.asset);
    if (!existsSync(assetPath)) {
      missingAssets.push(entry.asset);
      socketsOk = false;
      continue;
    }
    const buf = readFileSync(assetPath);
    let gltf: Record<string, unknown>;
    try {
      gltf = parseGlbJson(buf);
    } catch {
      missingAssets.push(entry.asset);
      socketsOk = false;
      continue;
    }
    const extras = (gltf.extras ?? {}) as Record<string, string>;
    const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
    const nameSet = new Set(nodes);
    const stamped =
      extras.atmosphereFinish5 === ATMOSPHERE_5.atmosphereFinish5Marker &&
      String(extras.envArt ?? "").includes(ATMOSPHERE_5.atmosphereFinish5Marker) &&
      extras.cozyArt === ATMOSPHERE_5.cozyArtMarker &&
      String(extras.envArt ?? "").includes(ATMOSPHERE_5.cozyArtMarker) &&
      extras.harborScenic === ATMOSPHERE_5.harborScenicMarker;
    if (stamped) stampedCount += 1;
    for (const sock of ATMOSPHERE_5.requiredSockets) {
      if (!nameSet.has(sock)) socketsOk = false;
    }
    for (const prefix of ATMOSPHERE_5.requiredSocketPrefixes) {
      if (!nodes.some((n) => n.startsWith(prefix))) socketsOk = false;
    }
  }

  const renderModulesPresent = ATMOSPHERE_5.renderModules.every((rel) =>
    existsSync(resolve(repoRoot, rel)),
  );

  // Smoke that atmosphereFrame still produces usable frames for parity samples.
  let atmosphereSamplesOk = true;
  try {
    for (const sample of [
      { dayProgressPermille: 250, weatherId: "clear" },
      { dayProgressPermille: 500, weatherId: "rain" },
      { dayProgressPermille: 850, weatherId: "fog" },
    ]) {
      const frame = atmosphereFrame(sample.dayProgressPermille, sample.weatherId);
      if (!frame.skyHex || frame.fogNear == null || frame.fogFar == null) {
        atmosphereSamplesOk = false;
      }
    }
  } catch {
    atmosphereSamplesOk = false;
  }

  const kickoffPath = resolve(repoRoot, ATMOSPHERE_5.kickoffCatalog);
  const kickoff = existsSync(kickoffPath) ? readJson(kickoffPath) : {};
  const phase11 = (kickoff.phases as any[])?.find((p) => p.phase === 11);

  const missingGates: string[] = [];
  for (const gate of ATMOSPHERE_5.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    harborCount: harbors.length,
    stampedCount,
    socketsOk,
    renderModulesPresent,
    atmosphereSamplesOk,
    gapClosed: kickoff?.gaps?.[ATMOSPHERE_5.gapClosed] === ATMOSPHERE_5.gapClosedValue,
    kickoffWired:
      phase11?.id === "atmosphere-5" && phase11?.validate === "atmosphere5:validate",
    missingGates,
    missingAssets,
  };
}
