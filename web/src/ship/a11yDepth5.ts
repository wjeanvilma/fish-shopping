/**
 * Finish 6.0 Phase 22 — a11y depth 5 ship constants
 * (mirrors shared/ship/a11y-depth-5.json).
 */
import catalogJson from "../../../shared/ship/a11y-depth-5.json";

export interface A11yDepth5Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  a11yDepth5Marker: string;
  extendsCatalog: string;
  depthCatalog: string;
  screenSurfaceMin: number;
  contrastPairMin: number;
  uiA11yStringKeyMin: number;
  liveRegionMin: number;
  parityFixture: string;
  validateScript: string;
  softA11yI18n5Validate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const A11Y_DEPTH_5 = catalogJson as unknown as A11yDepth5Catalog;
export const A11Y_DEPTH_5_PHASE = A11Y_DEPTH_5.phase;
export const A11Y_DEPTH_5_SCHEMA = A11Y_DEPTH_5.schema;
export const A11Y_DEPTH_5_MARKER = A11Y_DEPTH_5.a11yDepth5Marker;
export const SCREEN_SURFACE_FLOOR_5 = A11Y_DEPTH_5.screenSurfaceMin;
export const CONTRAST_PAIR_FLOOR_5 = A11Y_DEPTH_5.contrastPairMin;
export const UI_A11Y_STRING_FLOOR_5 = A11Y_DEPTH_5.uiA11yStringKeyMin;
export const LIVE_REGION_FLOOR_5 = A11Y_DEPTH_5.liveRegionMin;
