/**
 * Finish 3.0 Phase 25 — accessibility depth 2 catalog
 * (extends Finish 2.0 accessibility-depth).
 */
import depthJson from "../../../shared/a11y/accessibility-depth-2.json";
import { meetsContrast } from "./contrast";

export interface Depth2ContrastPair {
  id: string;
  fg: string;
  bg: string;
  role: string;
  minRatio: number;
  use: string;
}

export interface Depth2ScreenSurface {
  id: string;
  webDialogLabelKey: string;
  androidPaneTitleKey: string;
  initialFocus: string;
  keyboardPath: string;
  sectionLabelKey?: string;
}

export interface AccessibilityDepth2Catalog {
  phase: number;
  schema: string;
  extendsCatalog: string;
  screenSurfaceMin: number;
  contrastPairMin: number;
  uiA11yStringKeyMin: number;
  liveRegionMin: number;
  screenSurfaces: Depth2ScreenSurface[];
  contrastPairs: Depth2ContrastPair[];
  liveRegions: string[];
  simHzInvariant: number;
}

export const accessibilityDepth2 = depthJson as unknown as AccessibilityDepth2Catalog;
export const A11Y_DEPTH_2_CONTENT_PHASE = accessibilityDepth2.phase;
export const A11Y_DEPTH_2_CONTENT_SCHEMA = accessibilityDepth2.schema;
export const A11Y_DEPTH_2_SCREEN_IDS = accessibilityDepth2.screenSurfaces.map((s) => s.id);
export const A11Y_DEPTH_2_LIVE_REGIONS = accessibilityDepth2.liveRegions;

export function depth2ContrastFailures(): Depth2ContrastPair[] {
  return accessibilityDepth2.contrastPairs.filter(
    (p) => !meetsContrast(p.fg, p.bg, p.minRatio),
  );
}
