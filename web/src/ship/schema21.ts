/**
 * Finish 2.0 Phase 7 — schema 21 kickoff catalog
 * (mirrors shared/ship/schema-21.json).
 */
import schemaJson from "../../../shared/ship/schema-21.json";

export interface Schema21Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fromSchema: number;
  toSchema: number;
  migration: { field: string; type: string; default: unknown };
  contentPack: { saveSchemaVersion: number; path: string; schemaPath: string };
  lifecycle: {
    currentSchema: number;
    migrateThroughSchema: number;
    newLegacyFixture: string;
  };
  historicalFrozen: {
    storeReleaseSchema: number;
    completeReleaseSchema: number;
    hotfixLaneSchemaMustStay: number;
  };
  checklist: string[];
  preflightGates: string[];
}

export const SCHEMA_21 = schemaJson as unknown as Schema21Catalog;
export const SCHEMA_21_PHASE = SCHEMA_21.phase;
export const SCHEMA_21_SCHEMA = SCHEMA_21.schema;
export const SCHEMA_21_VERSION = SCHEMA_21.toSchema;
