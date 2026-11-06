/**
 * Phase 28 portrait HUD helpers (mirrors Android BoxWithConstraints portrait check).
 * Presentation-only — not part of the sim parity contract.
 */
export function isPortraitViewport(width: number, height: number): boolean {
  return width > 0 && height > 0 && width < height;
}

/** Compact harbor meta max-width fraction used by the portrait CSS/Compose chrome. */
export function harborMetaMaxFraction(portrait: boolean): number {
  return portrait ? 0.46 : 0.42;
}

/** Top-actions toolbar max-width fraction. */
export function topActionsMaxFraction(portrait: boolean): number {
  return portrait ? 0.5 : 0.52;
}
