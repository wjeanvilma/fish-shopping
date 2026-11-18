/**
 * Finish 3.0 Phase 25 — a11y depth 2 ship catalog
 * (mirrors shared/ship/a11y-depth-2.json).
 */
import catalogJson from "../../../shared/ship/a11y-depth-2.json";

export interface A11yDepth2ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  a11yDepth2Marker: string;
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

export const A11Y_DEPTH_2 = catalogJson as unknown as A11yDepth2ShipCatalog;
export const A11Y_DEPTH_2_PHASE = A11Y_DEPTH_2.phase;
export const A11Y_DEPTH_2_SCHEMA = A11Y_DEPTH_2.schema;
export const A11Y_DEPTH_2_MARKER = A11Y_DEPTH_2.a11yDepth2Marker;
export const SCREEN_SURFACE_FLOOR_2 = A11Y_DEPTH_2.screenSurfaceMin;
export const CONTRAST_PAIR_FLOOR_2 = A11Y_DEPTH_2.contrastPairMin;
export const UI_A11Y_STRING_FLOOR_2 = A11Y_DEPTH_2.uiA11yStringKeyMin;
export const LIVE_REGION_FLOOR_2 = A11Y_DEPTH_2.liveRegionMin;
