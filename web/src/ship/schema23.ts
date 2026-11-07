/**
 * Finish 2.0 Phase 15 — schema 23 kickoff mirror
 * (mirrors shared/ship/schema-23.json).
 */
import schemaJson from "../../../shared/ship/schema-23.json";

export interface Schema23ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  schemaVersion: number;
  fromSchema: number;
  toSchema: number;
  validateScript: string;
}

export const SCHEMA_23 = schemaJson as unknown as Schema23ShipCatalog;
export const SCHEMA_23_PHASE = SCHEMA_23.phase;
export const SCHEMA_23_SCHEMA = SCHEMA_23.schema;
export const SCHEMA_23_VERSION = SCHEMA_23.schemaVersion;
