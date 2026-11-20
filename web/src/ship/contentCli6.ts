/**
 * Finish 6.0 Phase 27 — content authoring CLI wave 6 + modular packs
 * (mirrors shared/ship/content-cli-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/content-cli-6.json";
import {
  ALL_SCAFFOLD_KINDS,
  SCAFFOLD_KINDS_6,
} from "../../../shared/tools/content_cli/ids";
import {
  FINISH6_PACK_FLOORS,
  measurePackFloors,
} from "../../../shared/tools/content_cli/packFloors";
import { measureAllModpacks } from "../../../shared/tools/content_cli/modpacks";

export interface ContentCli6ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  contentCli6Marker: string;
  closesGap: string;
  extendsContentCli5: string;
  moduleRoot: string;
  scaffoldKinds: string[];
  wave6ScaffoldKinds: string[];
  scaffoldKindMin: number;
  exampleFileMin: number;
  features: string[];
  featureMin: number;
  modpackFloor: number;
  packFloors: typeof FINISH6_PACK_FLOORS;
  parityFixture: string;
  validateScript: string;
  softContentCli5Validate: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  softFloors: Record<string, number | string>;
  checklist: string[];
  preflightGates: string[];
}

export const CONTENT_CLI_6 = catalogJson as unknown as ContentCli6ShipCatalog;
export const CONTENT_CLI_6_PHASE = CONTENT_CLI_6.phase;
export const CONTENT_CLI_6_SCHEMA = CONTENT_CLI_6.schema;
export const CONTENT_CLI_6_MARKER = CONTENT_CLI_6.contentCli6Marker;
export const CONTENT_CLI_6_CLOSES_GAP = CONTENT_CLI_6.closesGap;
export const CONTENT_CLI6_KIND_FLOOR = CONTENT_CLI_6.scaffoldKindMin;
export const CONTENT_CLI6_EXAMPLE_FLOOR = CONTENT_CLI_6.exampleFileMin;
export const CONTENT_CLI6_FEATURE_FLOOR = CONTENT_CLI_6.featureMin;
export const CONTENT_CLI6_MODPACK_FLOOR = CONTENT_CLI_6.modpackFloor;

export interface ContentCli6Measure {
  kindCount: number;
  wave6Count: number;
  exampleCount: number;
  featureCount: number;
  modpackCount: number;
  packFloorsMet: boolean;
  packShortfalls: string[];
  modpacksOk: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  floorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureContentCli6(repoRoot: string): ContentCli6Measure {
  const kickoff = readJson(resolve(repoRoot, CONTENT_CLI_6.kickoffCatalog));
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const fixture = readJson(resolve(repoRoot, CONTENT_CLI_6.parityFixture));
  const exampleFiles = (fixture.expect?.exampleFiles as string[]) ?? [];
  const features = CONTENT_CLI_6.features ?? [];
  const packMeasure = measurePackFloors(
    pack,
    {
      ...FINISH6_PACK_FLOORS,
      ...CONTENT_CLI_6.packFloors,
    },
    { repoRoot },
  );
  const modpacks = measureAllModpacks(repoRoot);
  const missingGates = (CONTENT_CLI_6.preflightGates ?? []).filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );
  const kindCount = ALL_SCAFFOLD_KINDS.length;
  const wave6Count = SCAFFOLD_KINDS_6.length;
  const exampleCount = exampleFiles.length;
  const featureCount = features.length;
  const gapClosed = kickoff.gaps?.contentCli6Missing === false;
  const phase27 = (kickoff.phases as any[] | undefined)?.find((p) => p.phase === 27);
  const kickoffWired =
    phase27?.id === "content-cli-6" && phase27?.validate === "contentcli6:validate";
  const floorsMet =
    kindCount >= CONTENT_CLI_6.scaffoldKindMin &&
    wave6Count >= 3 &&
    exampleCount >= CONTENT_CLI_6.exampleFileMin &&
    featureCount >= CONTENT_CLI_6.featureMin &&
    modpacks.files.length >= CONTENT_CLI_6.modpackFloor &&
    packMeasure.met &&
    modpacks.ok &&
    gapClosed &&
    kickoffWired &&
    missingGates.length === 0;

  return {
    kindCount,
    wave6Count,
    exampleCount,
    featureCount,
    modpackCount: modpacks.files.length,
    packFloorsMet: packMeasure.met,
    packShortfalls: packMeasure.shortfalls,
    modpacksOk: modpacks.ok,
    gapClosed,
    kickoffWired,
    floorsMet,
    missingGates,
  };
}
