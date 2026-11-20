/**
 * Finish 6.0 Phase 23 — Playwright E2E floors ≥24
 * (mirrors shared/ship/playwright-e2e-6.json).
 */
import catalogJson from "../../../shared/ship/playwright-e2e-6.json";

export interface PlaywrightE2e6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  playwrightE2e6Marker: string;
  closesGap: string;
  extendsCatalog: string;
  webE2eShip: string;
  deeplinkE2e5Ship: string;
  routesCatalog: string;
  scenarioFloor: number;
  idCountFloor: number;
  nestAliasMin: number;
  softWebScenarioFloor: number;
  softMinIdCount: number;
  parityFixture: string;
  validateScript: string;
  softDeeplinkE2e5Validate: string;
  softWebE2eValidate: string;
  kickoffCatalog: string;
  authorTool: string;
  nestAliases: string[];
  checklist: string[];
  preflightGates: string[];
  measured: {
    scenarios: number;
    idCount: number;
    nestAliases: number;
  };
}

export const PLAYWRIGHT_E2E_6 = catalogJson as unknown as PlaywrightE2e6Catalog;
export const PLAYWRIGHT_E2E_6_PHASE = PLAYWRIGHT_E2E_6.phase;
export const PLAYWRIGHT_E2E_6_SCHEMA = PLAYWRIGHT_E2E_6.schema;
export const PLAYWRIGHT_E2E_6_MARKER = PLAYWRIGHT_E2E_6.playwrightE2e6Marker;
export const PLAYWRIGHT_E2E_6_CLOSES_GAP = PLAYWRIGHT_E2E_6.closesGap;
export const PLAYWRIGHT_E2E_6_SCENARIO_FLOOR = PLAYWRIGHT_E2E_6.scenarioFloor;
export const PLAYWRIGHT_E2E_6_ID_FLOOR = PLAYWRIGHT_E2E_6.idCountFloor;
export const PLAYWRIGHT_E2E_6_NEST_ALIAS_MIN = PLAYWRIGHT_E2E_6.nestAliasMin;
