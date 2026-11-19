/**
 * Finish 5.0 Phase 24 — a11y depth 4 ship catalog
 * (mirrors shared/ship/a11y-depth-4.json).
 */
import catalogJson from "../../../shared/ship/a11y-depth-4.json";

export interface A11yDepth4ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  a11yDepth4Marker: string;
  extendsCatalog: string;
  depthCatalog: string;
  simHzInvariant: number;
  screenSurfaceMin: number;
  contrastPairMin: number;
  uiA11yStringKeyMin: number;
  liveRegionMin: number;
  parityFixture: string;
  validateScript: string;
  softA11yI18n4Validate: string;
}

export const A11Y_DEPTH_4 = catalogJson as unknown as A11yDepth4ShipCatalog;
export const A11Y_DEPTH_4_PHASE = A11Y_DEPTH_4.phase;
export const A11Y_DEPTH_4_SCHEMA = A11Y_DEPTH_4.schema;
export const A11Y_DEPTH_4_MARKER = A11Y_DEPTH_4.a11yDepth4Marker;
export const SCREEN_SURFACE_FLOOR_4 = A11Y_DEPTH_4.screenSurfaceMin;
export const CONTRAST_PAIR_FLOOR_4 = A11Y_DEPTH_4.contrastPairMin;
export const UI_A11Y_STRING_FLOOR_4 = A11Y_DEPTH_4.uiA11yStringKeyMin;
export const LIVE_REGION_FLOOR_4 = A11Y_DEPTH_4.liveRegionMin;
