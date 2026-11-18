/**
 * Finish 4.0 Phase 24 — accessibility depth 3 catalog
 * (extends Finish 3.0 accessibility-depth-2).
 */
import depthJson from "../../../shared/a11y/accessibility-depth-3.json";
import { meetsContrast } from "./contrast";

export interface Depth3ContrastPair {
  id: string;
  fg: string;
  bg: string;
  role: string;
  minRatio: number;
  use: string;
}

export interface Depth3ScreenSurface {
  id: string;
  webDialogLabelKey: string;
  androidPaneTitleKey: string;
  initialFocus: string;
  keyboardPath: string;
  sectionLabelKey?: string;
}

export interface AccessibilityDepth3Catalog {
  phase: number;
  schema: string;
  extendsCatalog: string;
  screenSurfaceMin: number;
  contrastPairMin: number;
  uiA11yStringKeyMin: number;
  liveRegionMin: number;
  screenSurfaces: Depth3ScreenSurface[];
  contrastPairs: Depth3ContrastPair[];
  liveRegions: string[];
  simHzInvariant: number;
}

export const accessibilityDepth3 = depthJson as unknown as AccessibilityDepth3Catalog;
export const A11Y_DEPTH_3_CONTENT_PHASE = accessibilityDepth3.phase;
export const A11Y_DEPTH_3_CONTENT_SCHEMA = accessibilityDepth3.schema;
export const A11Y_DEPTH_3_SCREEN_IDS = accessibilityDepth3.screenSurfaces.map((s) => s.id);
export const A11Y_DEPTH_3_LIVE_REGIONS = accessibilityDepth3.liveRegions;

export function depth3ContrastFailures(): Depth3ContrastPair[] {
  return accessibilityDepth3.contrastPairs.filter(
    (p) => !meetsContrast(p.fg, p.bg, p.minRatio),
  );
}
