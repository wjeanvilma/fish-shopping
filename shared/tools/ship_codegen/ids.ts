/**
 * Finish 6.0 Phase 3 — ship codegen naming helpers.
 */

export interface ShipCodegenCatalogEntry {
  id: string;
  source: string;
  tsModule: string;
  ktObject: string;
  exportName: string;
  ktName: string;
}

export interface ShipCodegenRegistry {
  phase: number;
  plan: string;
  schema: string;
  shipCodegenMarker: string;
  moduleRoot: string;
  cliEntry: string;
  npmScript: string;
  pythonWrapper: string;
  tsOutDir: string;
  ktOutDir: string;
  ktPackage: string;
  headerBanner: string;
  features: string[];
  featureMin: number;
  catalogMin: number;
  catalogs: ShipCodegenCatalogEntry[];
  closesGap: string;
  kickoffCatalog: string;
}

export function findMarkerField(catalog: Record<string, unknown>): {
  key: string;
  value: string;
} | null {
  if (typeof catalog.kickoffMarker === "string") {
    return { key: "kickoffMarker", value: catalog.kickoffMarker };
  }
  for (const [key, value] of Object.entries(catalog)) {
    if (key.endsWith("Marker") && typeof value === "string") {
      return { key, value };
    }
  }
  return null;
}

export function requireScalarString(
  catalog: Record<string, unknown>,
  key: string,
): string {
  const v = catalog[key];
  if (typeof v !== "string" || !v) {
    throw new Error(`catalog missing string field ${key}`);
  }
  return v;
}

export function requireScalarNumber(
  catalog: Record<string, unknown>,
  key: string,
): number {
  const v = catalog[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`catalog missing number field ${key}`);
  }
  return v;
}
