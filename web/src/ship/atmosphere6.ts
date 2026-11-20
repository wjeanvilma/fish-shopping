/**
 * Finish 6.0 Phase 11 — atmosphere/cozy render depth 6
 * mirrors shared/ship/atmosphere-6.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/atmosphere-6.json";
import { atmosphereFrame } from "../render/atmosphere";

export interface Atmosphere6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  atmosphere6Marker: string;
  atmosphereFinish6Marker: string;
  atmosphereFinish5Marker: string;
  cozyArtMarker: string;
  harborScenicMarker: string;
  harborArtPassCatalog: string;
  finish6HarborTarget: number;
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

export const ATMOSPHERE_6 = catalogJson as unknown as Atmosphere6Catalog;
export const ATMOSPHERE_6_PHASE = ATMOSPHERE_6.phase;
export const ATMOSPHERE_6_SCHEMA = ATMOSPHERE_6.schema;
export const ATMOSPHERE_6_MARKER = ATMOSPHERE_6.atmosphere6Marker;

export interface Atmosphere6Measure {
  harborCount: number;
  stampedCount: number;
  finish5Retained: boolean;
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

export function measureAtmosphere6(repoRoot: string): Atmosphere6Measure {
  const passPath = resolve(repoRoot, ATMOSPHERE_6.harborArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredHarbors: [] };
  const harbors = (pass.authoredHarbors ?? []) as { harborId: string; asset: string }[];

  let stampedCount = 0;
  let finish5Retained = true;
  let socketsOk = true;
  const missingAssets: string[] = [];

  for (const entry of harbors) {
    const assetPath = resolve(repoRoot, entry.asset);
    if (!existsSync(assetPath)) {
      missingAssets.push(entry.asset);
      socketsOk = false;
      finish5Retained = false;
      continue;
    }
    const buf = readFileSync(assetPath);
    let gltf: Record<string, unknown>;
    try {
      gltf = parseGlbJson(buf);
    } catch {
      missingAssets.push(entry.asset);
      socketsOk = false;
      finish5Retained = false;
      continue;
    }
    const extras = (gltf.extras ?? {}) as Record<string, string>;
    const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
    const nameSet = new Set(nodes);
    const stamped =
      extras.atmosphereFinish6 === ATMOSPHERE_6.atmosphereFinish6Marker &&
      String(extras.envArt ?? "").includes(ATMOSPHERE_6.atmosphereFinish6Marker) &&
      extras.cozyArt === ATMOSPHERE_6.cozyArtMarker &&
      String(extras.envArt ?? "").includes(ATMOSPHERE_6.cozyArtMarker) &&
      extras.harborScenic === ATMOSPHERE_6.harborScenicMarker;
    if (stamped) stampedCount += 1;
    if (
      extras.atmosphereFinish5 !== ATMOSPHERE_6.atmosphereFinish5Marker ||
      !String(extras.envArt ?? "").includes(ATMOSPHERE_6.atmosphereFinish5Marker)
    ) {
      finish5Retained = false;
    }
    for (const sock of ATMOSPHERE_6.requiredSockets) {
      if (!nameSet.has(sock)) socketsOk = false;
    }
    for (const prefix of ATMOSPHERE_6.requiredSocketPrefixes) {
      if (!nodes.some((n) => n.startsWith(prefix))) socketsOk = false;
    }
  }

  const renderModulesPresent = ATMOSPHERE_6.renderModules.every((rel) =>
    existsSync(resolve(repoRoot, rel)),
  );

  let atmosphereSamplesOk = true;
  try {
    for (const sample of [
      { dayProgressPermille: 250, weatherId: "clear" },
      { dayProgressPermille: 500, weatherId: "rain" },
      { dayProgressPermille: 850, weatherId: "fog" },
      { dayProgressPermille: 920, weatherId: "gale" },
    ]) {
      const frame = atmosphereFrame(sample.dayProgressPermille, sample.weatherId);
      if (!frame.skyHex || frame.fogNear == null || frame.fogFar == null || frame.fogFar <= frame.fogNear) {
        atmosphereSamplesOk = false;
      }
    }
  } catch {
    atmosphereSamplesOk = false;
  }

  const kickoffPath = resolve(repoRoot, ATMOSPHERE_6.kickoffCatalog);
  const kickoff = existsSync(kickoffPath) ? readJson(kickoffPath) : {};
  const phase11 = (kickoff.phases as any[])?.find((p) => p.phase === 11);

  const missingGates: string[] = [];
  for (const gate of ATMOSPHERE_6.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    harborCount: harbors.length,
    stampedCount,
    finish5Retained,
    socketsOk,
    renderModulesPresent,
    atmosphereSamplesOk,
    gapClosed: kickoff?.gaps?.[ATMOSPHERE_6.gapClosed] === ATMOSPHERE_6.gapClosedValue,
    kickoffWired:
      phase11?.id === "atmosphere-6" && phase11?.validate === "atmosphere6:validate",
    missingGates,
    missingAssets,
  };
}
