/**
 * Cozy art pass 5 — lets HUD overlays (photo mode, decorating) reach the live HarborScene
 * and its canvas without threading refs through the React tree. Presentation only.
 */
import type { HarborScene } from "./HarborScene";

export const sceneBridge: { scene: HarborScene | null; canvas: HTMLCanvasElement | null } = {
  scene: null,
  canvas: null,
};

// QA hook: `?fsdebug` exposes the bridge for screenshot scripts (night / rain previews).
if (typeof window !== "undefined" && typeof location !== "undefined" && location.search.includes("fsdebug")) {
  (window as unknown as { __fsBridge?: typeof sceneBridge }).__fsBridge = sceneBridge;
}
