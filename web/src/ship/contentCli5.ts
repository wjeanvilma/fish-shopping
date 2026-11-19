/**
 * Finish 5.0 Phase 28 — content authoring CLI wave 5 ship catalog
 * (mirrors shared/ship/content-cli-5.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/content-cli-5.json";
import {
  ALL_SCAFFOLD_KINDS,
  SCAFFOLD_KINDS_5,
} from "../../../shared/tools/content_cli/ids";
import {
  FINISH5_PACK_FLOORS,
  measurePackFloors,
} from "../../../shared/tools/content_cli/packFloors";

export interface ContentCli5ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  contentCli5Marker: string;
  closesGap: string;
  extendsContentCli3: string;
  moduleRoot: string;
  scaffoldKinds: string[];
  wave5ScaffoldKinds: string[];
  scaffoldKindMin: number;
  exampleFileMin: number;
  features: string[];
  featureMin: number;
  packFloors: typeof FINISH5_PACK_FLOORS;
  parityFixture: string;
  validateScript: string;
  softContentCli3Validate: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  softFloors: Record<string, number | string>;
  checklist: string[];
  preflightGates: string[];
}

export const CONTENT_CLI_5 = catalogJson as unknown as ContentCli5ShipCatalog;
export const CONTENT_CLI_5_PHASE = CONTENT_CLI_5.phase;
export const CONTENT_CLI_5_SCHEMA = CONTENT_CLI_5.schema;
export const CONTENT_CLI_5_MARKER = CONTENT_CLI_5.contentCli5Marker;
export const CONTENT_CLI_5_CLOSES_GAP = CONTENT_CLI_5.closesGap;
export const CONTENT_CLI5_KIND_FLOOR = CONTENT_CLI_5.scaffoldKindMin;
export const CONTENT_CLI5_EXAMPLE_FLOOR = CONTENT_CLI_5.exampleFileMin;
export const CONTENT_CLI5_FEATURE_FLOOR = CONTENT_CLI_5.featureMin;

export interface ContentCli5Measure {
  kindCount: number;
  wave5Count: number;
  exampleCount: number;
  featureCount: number;
  packFloorsMet: boolean;
  packShortfalls: string[];
  gapClosed: boolean;
  kickoffWired: boolean;
  floorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureContentCli5(repoRoot: string): ContentCli5Measure {
  const kickoff = readJson(resolve(repoRoot, CONTENT_CLI_5.kickoffCatalog));
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const fixture = readJson(resolve(repoRoot, CONTENT_CLI_5.parityFixture));
  const exampleFiles = (fixture.expect?.exampleFiles as string[]) ?? [];
  const features = CONTENT_CLI_5.features ?? [];
  const packMeasure = measurePackFloors(
    pack,
    {
      ...FINISH5_PACK_FLOORS,
      ...CONTENT_CLI_5.packFloors,
    },
    { repoRoot },
  );
  const missingGates = (CONTENT_CLI_5.preflightGates ?? []).filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );
  const kindCount = ALL_SCAFFOLD_KINDS.length;
  const wave5Count = SCAFFOLD_KINDS_5.length;
  const exampleCount = exampleFiles.length;
  const featureCount = features.length;
  const gapClosed = kickoff.gaps?.contentCli5Missing === false;
  const phase28 = (kickoff.phases as any[] | undefined)?.find((p) => p.phase === 28);
  const kickoffWired =
    phase28?.id === "content-cli-5" && phase28?.validate === "contentcli5:validate";
  const floorsMet =
    kindCount >= CONTENT_CLI_5.scaffoldKindMin &&
    wave5Count >= 3 &&
    exampleCount >= CONTENT_CLI_5.exampleFileMin &&
    featureCount >= CONTENT_CLI_5.featureMin &&
    packMeasure.met &&
    gapClosed &&
    kickoffWired &&
    missingGates.length === 0;

  return {
    kindCount,
    wave5Count,
    exampleCount,
    featureCount,
    packFloorsMet: packMeasure.met,
    packShortfalls: packMeasure.shortfalls,
    gapClosed,
    kickoffWired,
    floorsMet,
    missingGates,
  };
}
