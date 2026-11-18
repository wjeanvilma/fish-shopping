/**
 * Renderer-independent presentation logic. Pure functions of SimView, so they are easy to
 * test and to mirror in the Android renderer (render/Presenters.kt). They never affect rules.
 *
 * Finish 4.0 Phase 6 — facade re-exporting quality / locomotion / crowd / VFX modules.
 */
export * from "./presenters/quality";
export * from "./presenters/locomotion";
export * from "./presenters/crowd";
export * from "./presenters/vfx";
