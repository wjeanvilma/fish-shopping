/**
 * Finish 4.0 Phase 24 — a11y depth 3 ship catalog
 * (mirrors shared/ship/a11y-depth-3.json).
 */
import catalogJson from "../../../shared/ship/a11y-depth-3.json";

export interface A11yDepth3ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  a11yDepth3Marker: string;
  extendsCatalog: string;
  depthCatalog: string;
  simHzInvariant: number;
  screenSurfaceMin: number;
  contrastPairMin: number;
  uiA11yStringKeyMin: number;
  liveRegionMin: number;
  parityFixture: string;
  validateScript: string;
}

export const A11Y_DEPTH_3 = catalogJson as unknown as A11yDepth3ShipCatalog;
export const A11Y_DEPTH_3_PHASE = A11Y_DEPTH_3.phase;
export const A11Y_DEPTH_3_SCHEMA = A11Y_DEPTH_3.schema;
export const A11Y_DEPTH_3_MARKER = A11Y_DEPTH_3.a11yDepth3Marker;
export const SCREEN_SURFACE_FLOOR_3 = A11Y_DEPTH_3.screenSurfaceMin;
export const CONTRAST_PAIR_FLOOR_3 = A11Y_DEPTH_3.contrastPairMin;
export const UI_A11Y_STRING_FLOOR_3 = A11Y_DEPTH_3.uiA11yStringKeyMin;
export const LIVE_REGION_FLOOR_3 = A11Y_DEPTH_3.liveRegionMin;
