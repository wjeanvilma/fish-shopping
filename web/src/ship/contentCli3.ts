/**
 * Finish 4.0 Phase 28 — content authoring CLI wave 3 ship catalog
 * (mirrors shared/ship/content-cli-3.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/content-cli-3.json";
import { ALL_SCAFFOLD_KINDS, SCAFFOLD_KINDS_3 } from "../../../shared/tools/content_cli/ids";
import { FINISH4_PACK_FLOORS, measurePackFloors } from "../../../shared/tools/content_cli/packFloors";

export interface ContentCli3ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  contentCli3Marker: string;
  closesGap: string;
  extendsContentCli2: string;
  extendsContentCli: string;
  moduleRoot: string;
  scaffoldKinds: string[];
  wave3ScaffoldKinds: string[];
  scaffoldKindMin: number;
  exampleFileMin: number;
  features: string[];
  featureMin: number;
  packFloors: typeof FINISH4_PACK_FLOORS;
  parityFixture: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  softFloors: Record<string, number | string>;
  checklist: string[];
  preflightGates: string[];
}

export const CONTENT_CLI_3 = catalogJson as unknown as ContentCli3ShipCatalog;
export const CONTENT_CLI_3_PHASE = CONTENT_CLI_3.phase;
export const CONTENT_CLI_3_SCHEMA = CONTENT_CLI_3.schema;
export const CONTENT_CLI_3_MARKER = CONTENT_CLI_3.contentCli3Marker;
export const CONTENT_CLI_3_CLOSES_GAP = CONTENT_CLI_3.closesGap;
export const CONTENT_CLI3_KIND_FLOOR = CONTENT_CLI_3.scaffoldKindMin;
export const CONTENT_CLI3_EXAMPLE_FLOOR = CONTENT_CLI_3.exampleFileMin;
export const CONTENT_CLI3_FEATURE_FLOOR = CONTENT_CLI_3.featureMin;

export interface ContentCli3Measure {
  kindCount: number;
  wave3Count: number;
  exampleCount: number;
  featureCount: number;
  packFloorsMet: boolean;
  packShortfalls: string[];
  gapClosed: boolean;
  floorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureContentCli3(repoRoot: string): ContentCli3Measure {
  const kickoff = readJson(resolve(repoRoot, CONTENT_CLI_3.kickoffCatalog));
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const fixture = readJson(resolve(repoRoot, CONTENT_CLI_3.parityFixture));
  const exampleFiles = (fixture.expect?.exampleFiles as string[]) ?? [];
  const features = CONTENT_CLI_3.features ?? [];
  const packMeasure = measurePackFloors(pack, {
    ...FINISH4_PACK_FLOORS,
    ...CONTENT_CLI_3.packFloors,
  });
  const missingGates = (CONTENT_CLI_3.preflightGates ?? []).filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );
  const kindCount = ALL_SCAFFOLD_KINDS.length;
  const wave3Count = SCAFFOLD_KINDS_3.length;
  const exampleCount = exampleFiles.length;
  const featureCount = features.length;
  const gapClosed = kickoff.gaps?.contentCli3Missing === false;
  const floorsMet =
    kindCount >= CONTENT_CLI3_KIND_FLOOR &&
    wave3Count >= 2 &&
    exampleCount >= CONTENT_CLI3_EXAMPLE_FLOOR &&
    featureCount >= CONTENT_CLI3_FEATURE_FLOOR &&
    packMeasure.met &&
    gapClosed &&
    missingGates.length === 0;
  return {
    kindCount,
    wave3Count,
    exampleCount,
    featureCount,
    packFloorsMet: packMeasure.met,
    packShortfalls: packMeasure.shortfalls,
    gapClosed,
    floorsMet,
    missingGates,
  };
}
