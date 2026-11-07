/**
 * Phase 12 / 28 portrait HUD helpers (mirrors Android BoxWithConstraints portrait check).
 * Presentation-only — not part of the sim parity contract.
 *
 * Landscape remains the primary layout; portrait reflows the same actions so play and
 * management chrome stay usable without a rotate-to-landscape gate.
 */

export function isPortraitViewport(width: number, height: number): boolean {
  return width > 0 && height > 0 && width < height;
}

/** Compact harbor meta max-width fraction used by the portrait CSS/Compose chrome. */
export function harborMetaMaxFraction(portrait: boolean): number {
  return portrait ? 0.46 : 0.42;
}

/** Absolute px cap paired with [harborMetaMaxFraction] (CSS min(vw, px)). */
export function harborMetaMaxCapPx(portrait: boolean): number {
  return portrait ? 200 : 360;
}

/** Top-actions toolbar max-width fraction. */
export function topActionsMaxFraction(portrait: boolean): number {
  return portrait ? 0.5 : 0.52;
}

/** Absolute px cap paired with [topActionsMaxFraction]. */
export function topActionsMaxCapPx(portrait: boolean): number {
  return portrait ? 220 : 420;
}

/** Touch target min-height in px (Android actionMinHeight). Always ≥ design-token 48dp. */
export function actionMinHeightPx(_portrait?: boolean): number {
  return 48;
}

/** Joystick pad width fraction of the viewport (Android stickWidthFraction). */
export function stickWidthFraction(portrait: boolean): number {
  return portrait ? 0.56 : 0.42;
}

/** Joystick pad height fraction of the viewport (Android stickHeightFraction). */
export function stickHeightFraction(portrait: boolean): number {
  return portrait ? 0.36 : 0.48;
}

/** CSS max-width for the harbor meta pill. */
export function harborMetaMaxCss(portrait: boolean): string {
  return `min(${Math.round(harborMetaMaxFraction(portrait) * 100)}vw, ${harborMetaMaxCapPx(portrait)}px)`;
}

/** CSS max-width for the top management toolbar. */
export function topActionsMaxCss(portrait: boolean): string {
  return `min(${Math.round(topActionsMaxFraction(portrait) * 100)}vw, ${topActionsMaxCapPx(portrait)}px)`;
}

/** CSS width/height for the joystick / keys pad. */
export function stickPadSizeCss(portrait: boolean): { width: string; height: string } {
  const w = Math.round(stickWidthFraction(portrait) * 100);
  const h = Math.round(stickHeightFraction(portrait) * 100);
  return {
    width: `min(${w}vw, 280px)`,
    height: `min(${h}vh, ${portrait ? 280 : 320}px)`,
  };
}

/** Management sheet max-height — taller in portrait so lists remain scrollable. */
export function sheetMaxHeightCss(portrait: boolean): string {
  return portrait ? "min(78vh, calc(100vh - 20px))" : "min(70vh, calc(100vh - 32px))";
}

/** CSS custom properties applied on the game root for HUD + sheet reflow. */
export function portraitCssVars(portrait: boolean): Record<string, string> {
  const stick = stickPadSizeCss(portrait);
  return {
    "--harbor-meta-max": harborMetaMaxCss(portrait),
    "--top-actions-max": topActionsMaxCss(portrait),
    "--touch": `${actionMinHeightPx(portrait)}px`,
    "--stick-pad-width": stick.width,
    "--stick-pad-height": stick.height,
    "--sheet-max-height": sheetMaxHeightCss(portrait),
  };
}
