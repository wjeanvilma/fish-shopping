/**
 * Finish 3.0 Phase 8 — harbor art pass 2
 * (mirrors shared/ship/harbor-art-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/harbor-art-2.json";

export interface HarborArt2Entry {
  harborId: string;
  theme: string;
  asset: string;
}

export interface HarborArt2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  harborArt2Marker: string;
  harborArtPassCatalog: string;
  harborArtMarker: string;
  authoredHarborTarget: number;
  priorAuthoredHarborFloor: number;
  newAuthoredHarbors: HarborArt2Entry[];
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

export const HARBOR_ART_2 = catalogJson as unknown as HarborArt2Catalog;
export const HARBOR_ART_2_PHASE = HARBOR_ART_2.phase;
export const HARBOR_ART_2_SCHEMA = HARBOR_ART_2.schema;
export const HARBOR_ART_2_MARKER = HARBOR_ART_2.harborArt2Marker;

export interface HarborArt2Measure {
  authoredCount: number;
  newAuthoredPresent: boolean;
  newThemeCount: number;
  gapClosed: boolean;
  licensesOk: boolean;
  dodQuotaOk: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureHarborArt2(repoRoot: string): HarborArt2Measure {
  const passPath = resolve(repoRoot, HARBOR_ART_2.harborArtPassCatalog);
  const pass = existsSync(passPath) ? readJson(passPath) : { authoredHarbors: [] };
  const authored = (pass.authoredHarbors ?? []) as HarborArt2Entry[];
  const authoredIds = new Set(authored.map((h) => h.harborId));
  const newAuthoredPresent = HARBOR_ART_2.newAuthoredHarbors.every((h) =>
    authoredIds.has(h.harborId),
  );
  const newThemeCount = HARBOR_ART_2.newAuthoredHarbors.filter((h) =>
    authored.some((a) => a.harborId === h.harborId && a.theme === h.theme),
  ).length;

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, HARBOR_ART_2.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.[HARBOR_ART_2.gapClosed] === HARBOR_ART_2.gapClosedValue;
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
    dodQuotaOk = (dod.quotas?.authoredHarborScenes ?? 0) >= HARBOR_ART_2.authoredHarborTarget;
  }

  const missingGates: string[] = [];
  for (const gate of HARBOR_ART_2.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    authoredCount: authored.length,
    newAuthoredPresent,
    newThemeCount,
    gapClosed,
    licensesOk,
    dodQuotaOk,
    missingGates,
  };
}
