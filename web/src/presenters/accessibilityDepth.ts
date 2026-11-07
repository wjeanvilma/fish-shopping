/**
 * Finish 2.0 Phase 24 — accessibility depth catalog (extends Phase 16 sweep).
 */
import depthJson from "../../../shared/a11y/accessibility-depth.json";
import { meetsContrast } from "./contrast";

export interface DepthContrastPair {
  id: string;
  fg: string;
  bg: string;
  role: string;
  minRatio: number;
  use: string;
}

export interface DepthScreenSurface {
  id: string;
  webDialogLabelKey: string;
  androidPaneTitleKey: string;
  initialFocus: string;
  keyboardPath: string;
}

export interface AccessibilityDepthCatalog {
  phase: number;
  schema: string;
  extendsCatalog: string;
  screenSurfaceMin: number;
  contrastPairMin: number;
  uiA11yStringKeyMin: number;
  liveRegionMin: number;
  screenSurfaces: DepthScreenSurface[];
  contrastPairs: DepthContrastPair[];
  liveRegions: string[];
  simHzInvariant: number;
}

export const accessibilityDepth = depthJson as unknown as AccessibilityDepthCatalog;
export const A11Y_DEPTH_CONTENT_PHASE = accessibilityDepth.phase;
export const A11Y_DEPTH_CONTENT_SCHEMA = accessibilityDepth.schema;
export const A11Y_DEPTH_SCREEN_IDS = accessibilityDepth.screenSurfaces.map((s) => s.id);
export const A11Y_DEPTH_LIVE_REGIONS = accessibilityDepth.liveRegions;

export function depthContrastFailures(): DepthContrastPair[] {
  return accessibilityDepth.contrastPairs.filter(
    (p) => !meetsContrast(p.fg, p.bg, p.minRatio),
  );
}
