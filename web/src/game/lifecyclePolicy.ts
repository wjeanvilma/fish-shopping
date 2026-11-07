/**
 * Phase 28 — browser / Android lifecycle policy mirrors
 * `shared/lifecycle/browser-lifecycle.json` (presentation + host wiring only).
 */

export const LIFECYCLE_PHASE = 28;
export const LIFECYCLE_SCHEMA = "fish.lifecycle.browser_android.v1";
export const LIFECYCLE_CURRENT_SCHEMA = 20;
export const LIFECYCLE_MIGRATE_THROUGH_SCHEMA = 19;
export const LIFECYCLE_LEGACY_VERSIONS = [1, 12, 13, 14, 15, 16, 17, 18, 19] as const;

export const WEBGL2_GATE_COPY =
  "Fish Shopping needs a browser with WebGL 2. Try a current version of Chrome, Firefox, Edge or Safari, and make sure hardware acceleration is turned on.";

export const CONTEXT_LOSS_BANNER =
  "Graphics context lost — recovering scene…";

export const STORAGE_UNAVAILABLE_TOAST =
  "Saving is unavailable in this browser window";

export const STORAGE_UNAVAILABLE_SETTINGS =
  "Memory-only (storage unavailable).";

/** Tab hidden → pause sim + checkpoint. */
export function shouldPauseForVisibility(hidden: boolean): boolean {
  return hidden;
}

/** pagehide always checkpoints (bfcache or unload). */
export function shouldCheckpointOnPageHide(): boolean {
  return true;
}

/** Hide audio while the tab is backgrounded. */
export function shouldSuspendAudioWhenHidden(hidden: boolean): boolean {
  return hidden;
}

/** Audio unlock requires a user gesture before Web Audio can start. */
export function audioUnlockEvents(): readonly ("pointerdown" | "keydown")[] {
  return ["pointerdown", "keydown"];
}

/** Android configChanges handled without Activity recreate (rotation QA). */
export function androidConfigChanges(): readonly string[] {
  return ["orientation", "screenSize", "screenLayout", "smallestScreenSize", "keyboardHidden"];
}
