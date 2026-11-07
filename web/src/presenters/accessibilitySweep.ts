/**
 * Phase 16 (post-1.0) — accessibility & controls sweep catalog.
 */
import sweepJson from "../../../shared/a11y/accessibility-sweep.json";
import tokensJson from "../../../shared/tokens/design-tokens.json";
import { meetsContrast } from "./contrast";
import { KEYBOARD_SHORTCUTS, MIN_TOUCH_TARGET_DP } from "./controlQa";

export interface ContrastPairCatalog {
  id: string;
  fg: string;
  bg: string;
  role: string;
  minRatio: number;
  use: string;
}

export interface AccessibilitySweepCatalog {
  phase: number;
  schema: string;
  minTouchTargetDp: number;
  wcag: { normalTextMin: number; largeOrUiMin: number };
  contrastPairs: ContrastPairCatalog[];
  controls: {
    minTouchTargetDp: number;
    requiredActions: string[];
  };
  talkBack: {
    android: { joystickContentDescription: string };
    web: { harborCanvasAriaLabel: string; toolbarAriaLabel: string; focusVisibleOutline: boolean };
  };
  failCriteria: string[];
}

export const accessibilitySweep = sweepJson as unknown as AccessibilitySweepCatalog;
export const A11Y_SWEEP_PHASE = accessibilitySweep.phase;
export const A11Y_SWEEP_SCHEMA = accessibilitySweep.schema;

export function contrastFailures(): ContrastPairCatalog[] {
  return accessibilitySweep.contrastPairs.filter(
    (p) => !meetsContrast(p.fg, p.bg, p.minRatio),
  );
}

export function touchTargetMatchesTokens(): boolean {
  const token = (tokensJson as { size: { minTouchTargetDp: number } }).size.minTouchTargetDp;
  return (
    token === 48 &&
    accessibilitySweep.minTouchTargetDp === 48 &&
    MIN_TOUCH_TARGET_DP === 48 &&
    accessibilitySweep.controls.minTouchTargetDp === 48
  );
}

export function missingKeyboardActions(): string[] {
  const have = new Set(KEYBOARD_SHORTCUTS.map((s) => s.action));
  // Web Esc action label is slightly shorter than Android ("Close panel / pause" vs includes Back)
  const aliases: Record<string, string[]> = {
    "Close panel / pause": ["Close panel / pause"],
  };
  return accessibilitySweep.controls.requiredActions.filter((action) => {
    if (have.has(action)) return false;
    const al = aliases[action];
    return !al?.some((a) => have.has(a as typeof KEYBOARD_SHORTCUTS[number]["action"]));
  });
}
