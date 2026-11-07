/**
 * Phase 19 — accessibility helpers (presentation-only). Shape cues back status
 * colour, HUD text scale, timing-meter bands, and a one-tap Accessibility preset.
 */

export const HUD_TEXT_SCALES = [1, 1.15, 1.3] as const;
export type HudTextScale = (typeof HUD_TEXT_SCALES)[number];

export type StatusShape = "triangle" | "circle" | "square" | "diamond" | "ring";

/** Non-colour status glyph for machine / station state. */
export function statusShapeFor(status: string): StatusShape {
  switch (status) {
    case "PROCESSING":
      return "triangle";
    case "PAUSED":
      return "square";
    case "NEEDS_REPAIR":
    case "LOCKED":
      return "diamond";
    case "OUTPUT_FULL":
    case "WAITING_FOR_OUTPUT":
      return "ring";
    case "WAITING_FOR_INPUT":
    case "IDLE":
    default:
      return "circle";
  }
}

export function statusShapeGlyph(shape: StatusShape): string {
  switch (shape) {
    case "triangle":
      return "▶";
    case "square":
      return "■";
    case "diamond":
      return "◆";
    case "ring":
      return "◎";
    case "circle":
    default:
      return "●";
  }
}

export function clampHudTextScale(v: number): HudTextScale {
  let best: HudTextScale = 1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const step of HUD_TEXT_SCALES) {
    const d = Math.abs(step - v);
    if (d < bestDist) {
      best = step;
      bestDist = d;
    }
  }
  return best;
}

/** One-tap Accessibility preset: captions, reduced motion, larger HUD, shapes, timing meter. */
export function accessibilityPreset(): {
  reducedMotion: true;
  captionsEnabled: true;
  hudTextScale: 1.15;
  shapeCues: true;
  timingAssist: true;
} {
  return {
    reducedMotion: true,
    captionsEnabled: true,
    hudTextScale: 1.15,
    shapeCues: true,
    timingAssist: true,
  };
}

export function hudTextScaleLabel(scale: HudTextScale): string {
  if (scale === 1.15) return "Med";
  if (scale === 1.3) return "Large";
  return "Default";
}
