/**
 * Finish 2.0 Phase 24 — a11y depth ship catalog
 * (mirrors shared/ship/a11y-depth.json).
 */
import catalogJson from "../../../shared/ship/a11y-depth.json";

export interface A11yDepthShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  a11yDepthMarker: string;
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

export const A11Y_DEPTH = catalogJson as unknown as A11yDepthShipCatalog;
export const A11Y_DEPTH_PHASE = A11Y_DEPTH.phase;
export const A11Y_DEPTH_SCHEMA = A11Y_DEPTH.schema;
export const A11Y_DEPTH_MARKER = A11Y_DEPTH.a11yDepthMarker;
export const SCREEN_SURFACE_FLOOR = A11Y_DEPTH.screenSurfaceMin;
export const CONTRAST_PAIR_FLOOR = A11Y_DEPTH.contrastPairMin;
export const UI_A11Y_STRING_FLOOR = A11Y_DEPTH.uiA11yStringKeyMin;
export const LIVE_REGION_FLOOR = A11Y_DEPTH.liveRegionMin;
