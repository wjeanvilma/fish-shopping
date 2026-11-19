/**
 * Finish 6.0 Phase 22 — accessibility depth 5 catalog
 * (extends Finish 5.0 accessibility-depth-4).
 */
import depthJson from "../../../shared/a11y/accessibility-depth-5.json";
import { meetsContrast } from "./contrast";

export interface Depth5ContrastPair {
  id: string;
  fg: string;
  bg: string;
  role: string;
  minRatio: number;
  use: string;
}

export interface Depth5ScreenSurface {
  id: string;
  webDialogLabelKey: string;
  androidPaneTitleKey: string;
  initialFocus: string;
  keyboardPath: string;
  sectionLabelKey?: string;
}

export interface AccessibilityDepth5Catalog {
  phase: number;
  schema: string;
  extendsCatalog: string;
  screenSurfaceMin: number;
  contrastPairMin: number;
  uiA11yStringKeyMin: number;
  liveRegionMin: number;
  screenSurfaces: Depth5ScreenSurface[];
  contrastPairs: Depth5ContrastPair[];
  liveRegions: string[];
  simHzInvariant: number;
}

export const accessibilityDepth5 = depthJson as unknown as AccessibilityDepth5Catalog;
export const A11Y_DEPTH_5_CONTENT_PHASE = accessibilityDepth5.phase;
export const A11Y_DEPTH_5_CONTENT_SCHEMA = accessibilityDepth5.schema;
export const A11Y_DEPTH_5_SCREEN_IDS = accessibilityDepth5.screenSurfaces.map((s) => s.id);
export const A11Y_DEPTH_5_LIVE_REGIONS = accessibilityDepth5.liveRegions;

export function depth5ContrastFailures(): Depth5ContrastPair[] {
  return accessibilityDepth5.contrastPairs.filter(
    (p) => !meetsContrast(p.fg, p.bg, p.minRatio),
  );
}
