/**
 * Finish 2.0 Phase 14 — schema 22 kickoff mirror
 * (mirrors shared/ship/schema-22.json).
 */
import schemaJson from "../../../shared/ship/schema-22.json";

export interface Schema22ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  schemaVersion: number;
  fromSchema: number;
  toSchema: number;
  validateScript: string;
}

export const SCHEMA_22 = schemaJson as unknown as Schema22ShipCatalog;
export const SCHEMA_22_PHASE = SCHEMA_22.phase;
export const SCHEMA_22_SCHEMA = SCHEMA_22.schema;
export const SCHEMA_22_VERSION = SCHEMA_22.schemaVersion;
