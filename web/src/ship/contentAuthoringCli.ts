/**
 * Finish 2.0 Phase 27 — content authoring CLI ship catalog
 * (mirrors shared/ship/content-authoring-cli.json).
 */
import catalogJson from "../../../shared/ship/content-authoring-cli.json";

export interface ContentAuthoringCliShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  contentCliMarker: string;
  moduleRoot: string;
  pythonWrapper: string;
  examplesDir: string;
  scaffoldKinds: string[];
  scaffoldKindMin: number;
  exampleFileMin: number;
  contentValidateStillGreen: boolean;
  parityFixture: string;
  validateScript: string;
}

export const CONTENT_AUTHORING_CLI = catalogJson as unknown as ContentAuthoringCliShipCatalog;
export const CONTENT_AUTHORING_CLI_PHASE = CONTENT_AUTHORING_CLI.phase;
export const CONTENT_AUTHORING_CLI_SCHEMA = CONTENT_AUTHORING_CLI.schema;
export const CONTENT_AUTHORING_CLI_MARKER = CONTENT_AUTHORING_CLI.contentCliMarker;
export const SCAFFOLD_KIND_FLOOR = CONTENT_AUTHORING_CLI.scaffoldKindMin;
export const SCAFFOLD_EXAMPLE_FLOOR = CONTENT_AUTHORING_CLI.exampleFileMin;
