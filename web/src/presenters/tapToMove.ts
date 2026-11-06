/**
 * Presentation-only tap-to-move: converts a ground destination into a screen-space
 * stick vector that [CameraRig.screenToWorld] maps back to the same world direction.
 * Arrival clears the target — no new sim APIs.
 */

export interface TapTarget {
  xMm: number;
  zMm: number;
}

/** Distance (mm) at which we consider the player arrived and clear the target. */
export const TAP_ARRIVE_MM = 400;

/**
 * Returns screen-space stick components in [-1, 1], or null when arrived / no target.
 * Screen axes match CameraRig: screen right → world −x, screen up → world −z.
 */
export function stickFromTapTarget(
  playerXMm: number,
  playerZMm: number,
  target: TapTarget | null,
  arriveMm: number = TAP_ARRIVE_MM,
): { sx: number; sy: number } | null {
  if (!target) return null;
  const dx = target.xMm - playerXMm;
  const dz = target.zMm - playerZMm;
  const len = Math.hypot(dx, dz);
  if (len <= arriveMm) return null;
  const nx = dx / len;
  const nz = dz / len;
  // Inverse of screenToWorld: world (nx, nz) ← screen (−nx, −nz)
  return { sx: -nx, sy: -nz };
}
