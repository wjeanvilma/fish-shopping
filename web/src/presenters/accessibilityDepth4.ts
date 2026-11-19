/**
 * Finish 5.0 Phase 24 — accessibility depth 4 catalog
 * (extends Finish 4.0 accessibility-depth-3).
 */
import depthJson from "../../../shared/a11y/accessibility-depth-4.json";
import { meetsContrast } from "./contrast";

export interface Depth4ContrastPair {
  id: string;
  fg: string;
  bg: string;
  role: string;
  minRatio: number;
  use: string;
}

export interface Depth4ScreenSurface {
  id: string;
  webDialogLabelKey: string;
  androidPaneTitleKey: string;
  initialFocus: string;
  keyboardPath: string;
  sectionLabelKey?: string;
}

export interface AccessibilityDepth4Catalog {
  phase: number;
  schema: string;
  extendsCatalog: string;
  screenSurfaceMin: number;
  contrastPairMin: number;
  uiA11yStringKeyMin: number;
  liveRegionMin: number;
  screenSurfaces: Depth4ScreenSurface[];
  contrastPairs: Depth4ContrastPair[];
  liveRegions: string[];
  simHzInvariant: number;
}

export const accessibilityDepth4 = depthJson as unknown as AccessibilityDepth4Catalog;
export const A11Y_DEPTH_4_CONTENT_PHASE = accessibilityDepth4.phase;
export const A11Y_DEPTH_4_CONTENT_SCHEMA = accessibilityDepth4.schema;
export const A11Y_DEPTH_4_SCREEN_IDS = accessibilityDepth4.screenSurfaces.map((s) => s.id);
export const A11Y_DEPTH_4_LIVE_REGIONS = accessibilityDepth4.liveRegions;

export function depth4ContrastFailures(): Depth4ContrastPair[] {
  return accessibilityDepth4.contrastPairs.filter(
    (p) => !meetsContrast(p.fg, p.bg, p.minRatio),
  );
}
