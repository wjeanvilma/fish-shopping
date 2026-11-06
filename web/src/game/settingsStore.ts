/**
 * Presentation-only settings (not part of the parity save). Mute is wired in Phase 25;
 * quality is available for renderers to read.
 */
export type QualityPreset = "low" | "medium" | "high";

export interface GameSettings {
  muted: boolean;
  quality: QualityPreset;
}

const KEY = "fish-shopping-settings";
const DEFAULTS: GameSettings = { muted: false, quality: "medium" };

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULTS.muted,
      quality: parsed.quality === "low" || parsed.quality === "high" || parsed.quality === "medium"
        ? parsed.quality
        : DEFAULTS.quality,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // private mode / quota — ignore
  }
}
