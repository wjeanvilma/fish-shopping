/**
 * Finish 6.0 Phase 24 — Compose instrumented floors ≥20
 * (mirrors shared/ship/compose-e2e-6.json).
 */
import catalogJson from "../../../shared/ship/compose-e2e-6.json";

export interface ComposeE2e6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  composeE2e6Marker: string;
  closesGap: string;
  extendsCatalog: string;
  composeUiShip: string;
  deeplinkE2e5Ship: string;
  scenarioFloor: number;
  tagCountFloor: number;
  softComposeScenarioFloor: number;
  softMinTagCount: number;
  parityFixture: string;
  validateScript: string;
  softDeeplinkE2e5Validate: string;
  softComposeUiValidate: string;
  kickoffCatalog: string;
  authorTool: string;
  nestTags: string[];
  checklist: string[];
  preflightGates: string[];
  measured: {
    scenarios: number;
    tagCount: number;
    nestTags: number;
  };
}

export const COMPOSE_E2E_6 = catalogJson as unknown as ComposeE2e6Catalog;
export const COMPOSE_E2E_6_PHASE = COMPOSE_E2E_6.phase;
export const COMPOSE_E2E_6_SCHEMA = COMPOSE_E2E_6.schema;
export const COMPOSE_E2E_6_MARKER = COMPOSE_E2E_6.composeE2e6Marker;
export const COMPOSE_E2E_6_CLOSES_GAP = COMPOSE_E2E_6.closesGap;
export const COMPOSE_E2E_6_SCENARIO_FLOOR = COMPOSE_E2E_6.scenarioFloor;
export const COMPOSE_E2E_6_TAG_FLOOR = COMPOSE_E2E_6.tagCountFloor;
