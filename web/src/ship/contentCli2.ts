/**
 * Finish 3.0 Phase 28 — content authoring CLI expansion ship catalog
 * (mirrors shared/ship/content-cli-2.json).
 */
import catalogJson from "../../../shared/ship/content-cli-2.json";

export interface ContentCli2ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  contentCli2Marker: string;
  extendsContentCli: string;
  moduleRoot: string;
  scaffoldKinds: string[];
  expansionScaffoldKinds: string[];
  scaffoldKindMin: number;
  exampleFileMin: number;
  features: string[];
  featureMin: number;
  parityFixture: string;
  validateScript: string;
  simHzInvariant: number;
}

export const CONTENT_CLI_2 = catalogJson as unknown as ContentCli2ShipCatalog;
export const CONTENT_CLI_2_PHASE = CONTENT_CLI_2.phase;
export const CONTENT_CLI_2_SCHEMA = CONTENT_CLI_2.schema;
export const CONTENT_CLI_2_MARKER = CONTENT_CLI_2.contentCli2Marker;
export const CONTENT_CLI2_KIND_FLOOR = CONTENT_CLI_2.scaffoldKindMin;
export const CONTENT_CLI2_EXAMPLE_FLOOR = CONTENT_CLI_2.exampleFileMin;
export const CONTENT_CLI2_FEATURE_FLOOR = CONTENT_CLI_2.featureMin;
