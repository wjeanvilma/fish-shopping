/**
 * Finish 6.0 Phase 3 — emit thin TS/Kotlin constant mirrors from ship JSON.
 */
import {
  findMarkerField,
  requireScalarNumber,
  requireScalarString,
  type ShipCodegenCatalogEntry,
  type ShipCodegenRegistry,
} from "./ids";

export interface ExtractedShipContract {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  markerKey: string;
  markerValue: string;
  validateScript: string | null;
  smokeScript: string | null;
  parityFixture: string | null;
  checklistCount: number;
  preflightCount: number;
}

export function extractContract(catalog: Record<string, unknown>): ExtractedShipContract {
  const marker = findMarkerField(catalog);
  if (!marker) throw new Error("catalog missing *Marker / kickoffMarker field");
  const checklist = Array.isArray(catalog.checklist) ? catalog.checklist : [];
  const preflight = Array.isArray(catalog.preflightGates) ? catalog.preflightGates : [];
  return {
    phase: requireScalarNumber(catalog, "phase"),
    plan: requireScalarString(catalog, "plan"),
    schema: requireScalarString(catalog, "schema"),
    contentVersion: requireScalarString(catalog, "contentVersion"),
    schemaVersion: requireScalarNumber(catalog, "schemaVersion"),
    markerKey: marker.key,
    markerValue: marker.value,
    validateScript: typeof catalog.validateScript === "string" ? catalog.validateScript : null,
    smokeScript: typeof catalog.smokeScript === "string" ? catalog.smokeScript : null,
    parityFixture: typeof catalog.parityFixture === "string" ? catalog.parityFixture : null,
    checklistCount: checklist.length,
    preflightCount: preflight.length,
  };
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function emitTypeScript(
  entry: ShipCodegenCatalogEntry,
  contract: ExtractedShipContract,
  registry: ShipCodegenRegistry,
): string {
  const lines = [
    `/** ${registry.headerBanner}`,
    ` * Source: ${entry.source}`,
    ` * Registry: shared/ship/ship-codegen.json (${entry.id})`,
    ` */`,
    `export const ${entry.exportName} = {`,
    `  id: "${esc(entry.id)}",`,
    `  source: "${esc(entry.source)}",`,
    `  phase: ${contract.phase},`,
    `  plan: "${esc(contract.plan)}",`,
    `  schema: "${esc(contract.schema)}",`,
    `  contentVersion: "${esc(contract.contentVersion)}",`,
    `  schemaVersion: ${contract.schemaVersion},`,
    `  markerKey: "${esc(contract.markerKey)}",`,
    `  marker: "${esc(contract.markerValue)}",`,
    `  validateScript: ${contract.validateScript ? `"${esc(contract.validateScript)}"` : "null"},`,
    `  smokeScript: ${contract.smokeScript ? `"${esc(contract.smokeScript)}"` : "null"},`,
    `  parityFixture: ${contract.parityFixture ? `"${esc(contract.parityFixture)}"` : "null"},`,
    `  checklistCount: ${contract.checklistCount},`,
    `  preflightCount: ${contract.preflightCount},`,
    `} as const;`,
    ``,
    `export type ${entry.exportName}_TYPE = typeof ${entry.exportName};`,
    ``,
  ];
  return lines.join("\n");
}

export function emitKotlin(
  entry: ShipCodegenCatalogEntry,
  contract: ExtractedShipContract,
  registry: ShipCodegenRegistry,
): string {
  const lines = [
    `package ${registry.ktPackage}`,
    ``,
    `/**`,
    ` * ${registry.headerBanner}`,
    ` * Source: ${entry.source}`,
    ` * Registry: shared/ship/ship-codegen.json (${entry.id})`,
    ` */`,
    `object ${entry.ktName} {`,
    `    const val ID = "${esc(entry.id)}"`,
    `    const val SOURCE = "${esc(entry.source)}"`,
    `    const val PHASE = ${contract.phase}`,
    `    const val PLAN = "${esc(contract.plan)}"`,
    `    const val SCHEMA = "${esc(contract.schema)}"`,
    `    const val CONTENT_VERSION = "${esc(contract.contentVersion)}"`,
    `    const val SCHEMA_VERSION = ${contract.schemaVersion}`,
    `    const val MARKER_KEY = "${esc(contract.markerKey)}"`,
    `    const val MARKER = "${esc(contract.markerValue)}"`,
    `    const val VALIDATE_SCRIPT = "${esc(contract.validateScript ?? "")}"`,
    `    const val SMOKE_SCRIPT = "${esc(contract.smokeScript ?? "")}"`,
    `    const val PARITY_FIXTURE = "${esc(contract.parityFixture ?? "")}"`,
    `    const val CHECKLIST_COUNT = ${contract.checklistCount}`,
    `    const val PREFLIGHT_COUNT = ${contract.preflightCount}`,
    `}`,
    ``,
  ];
  return lines.join("\n");
}

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}
