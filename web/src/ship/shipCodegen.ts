/**
 * Finish 6.0 Phase 3 — ship catalog codegen
 * (mirrors shared/ship/ship-codegen.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/ship-codegen.json";
import {
  buildArtifacts,
  checkArtifacts,
  loadRegistry,
} from "../../../shared/tools/ship_codegen/cli";

export interface ShipCodegenCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  shipCodegenMarker: string;
  closesGap: string;
  moduleRoot: string;
  cliEntry: string;
  npmScript: string;
  pythonWrapper: string;
  tsOutDir: string;
  ktOutDir: string;
  features: string[];
  featureMin: number;
  catalogMin: number;
  catalogs: Array<{
    id: string;
    source: string;
    tsModule: string;
    ktObject: string;
    exportName: string;
    ktName: string;
  }>;
  parityFixture: string;
  validateScript: string;
  smokeScript: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const SHIP_CODEGEN = catalogJson as unknown as ShipCodegenCatalog;
export const SHIP_CODEGEN_PHASE = SHIP_CODEGEN.phase;
export const SHIP_CODEGEN_SCHEMA = SHIP_CODEGEN.schema;
export const SHIP_CODEGEN_MARKER = SHIP_CODEGEN.shipCodegenMarker;

export interface ShipCodegenMeasure {
  catalogCount: number;
  featureCount: number;
  kickoffWired: boolean;
  gapClosed: boolean;
  checkClean: boolean;
  checkErrors: string[];
  missingGates: string[];
  generatedPresent: boolean;
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureShipCodegen(repoRoot: string): ShipCodegenMeasure {
  const kickoff = existsSync(resolve(repoRoot, SHIP_CODEGEN.kickoffCatalog))
    ? readJson(resolve(repoRoot, SHIP_CODEGEN.kickoffCatalog))
    : null;
  const phase3 = (kickoff?.phases as any[] | undefined)?.find((p) => p.phase === 3);
  const kickoffWired =
    phase3?.id === "ship-codegen" && phase3?.validate === "shipcodegen:validate";
  const gapClosed = kickoff?.gaps?.shipCodegenMissing === false;

  const missingGates: string[] = [];
  for (const gate of SHIP_CODEGEN.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const registry = loadRegistry(repoRoot);
  const artifacts = buildArtifacts(registry, repoRoot);
  const checkErrors = checkArtifacts(artifacts);
  const generatedPresent = artifacts.every(
    (a) => existsSync(a.tsPath) && existsSync(a.ktPath),
  );

  return {
    catalogCount: SHIP_CODEGEN.catalogs.length,
    featureCount: SHIP_CODEGEN.features.length,
    kickoffWired,
    gapClosed,
    checkClean: checkErrors.length === 0,
    checkErrors,
    missingGates,
    generatedPresent,
  };
}
