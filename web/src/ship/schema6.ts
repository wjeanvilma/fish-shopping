/**
 * Finish 6.0 Phase 2 — schema foundations
 * (mirrors shared/ship/schema-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/schema-6.json";
import { measureSchemaFoundations, SCHEMA_INDEX } from "../schema/contractValidate";

export interface Schema6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  schema6Marker: string;
  schemaIndex: string;
  schemas: Record<string, string>;
  schemaMin: number;
  sampleCatalogMin: { ship: number; billing: number; ops: number };
  draft: string;
  parityFixture: string;
  validateScript: string;
  smokeScript: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const SCHEMA_6 = catalogJson as unknown as Schema6Catalog;
export const SCHEMA_6_PHASE = SCHEMA_6.phase;
export const SCHEMA_6_SCHEMA = SCHEMA_6.schema;
export const SCHEMA_6_MARKER = SCHEMA_6.schema6Marker;

export interface Schema6Measure {
  schemaCount: number;
  indexOk: boolean;
  shipValidated: number;
  billingValidated: number;
  opsValidated: number;
  ajvOk: boolean;
  kickoffWired: boolean;
  gapClosed: boolean;
  missingGates: string[];
  sampleErrors: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureSchema6(repoRoot: string): Schema6Measure {
  const foundations = measureSchemaFoundations(repoRoot);
  const kickoff = existsSync(resolve(repoRoot, SCHEMA_6.kickoffCatalog))
    ? readJson(resolve(repoRoot, SCHEMA_6.kickoffCatalog))
    : null;
  const phase2 = (kickoff?.phases as any[] | undefined)?.find((p) => p.phase === 2);
  const kickoffWired =
    phase2?.id === "schema-foundations" && phase2?.validate === "schema6:validate";
  const gapClosed = kickoff?.gaps?.schemaFoundationsIncomplete === false;

  const missingGates: string[] = [];
  for (const gate of SCHEMA_6.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }
  for (const path of Object.values(SCHEMA_6.schemas)) {
    if (!existsSync(resolve(repoRoot, path))) missingGates.push(path);
  }

  const sampleErrors = [
    ...foundations.ship.errors,
    ...foundations.billing.errors,
    ...foundations.ops.errors,
  ];

  const indexOk =
    SCHEMA_INDEX.schemas.length >= SCHEMA_6.schemaMin &&
    SCHEMA_INDEX.sampleCatalogs.ship.length >= SCHEMA_6.sampleCatalogMin.ship &&
    SCHEMA_INDEX.sampleCatalogs.billing.length >= SCHEMA_6.sampleCatalogMin.billing &&
    SCHEMA_INDEX.sampleCatalogs.ops.length >= SCHEMA_6.sampleCatalogMin.ops &&
    foundations.indexIds.includes("content-pack") &&
    foundations.indexIds.includes("ship-catalog") &&
    foundations.indexIds.includes("billing-contract") &&
    foundations.indexIds.includes("ops-catalog");

  return {
    schemaCount: foundations.schemaCount,
    indexOk,
    shipValidated: foundations.ship.validated,
    billingValidated: foundations.billing.validated,
    opsValidated: foundations.ops.validated,
    ajvOk: foundations.allOk,
    kickoffWired,
    gapClosed,
    missingGates,
    sampleErrors,
  };
}
