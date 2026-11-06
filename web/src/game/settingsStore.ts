/**
 * Presentation-only settings (not part of the parity save). Mute gates the AudioBus;
 * quality, accessibility, and optional cloud sync are client-local.
 */
export type QualityPreset = "low" | "medium" | "high";
export type JoystickSide = "left" | "right";
/** Multiplier on the 140px design-token diameter. */
export type JoystickScale = 0.75 | 1 | 1.25;

export interface GameSettings {
  muted: boolean;
  quality: QualityPreset;
  /** Bottom corner for the virtual stick. */
  joystickSide: JoystickSide;
  joystickScale: JoystickScale;
  /** When true, tapping the harbor walks toward that ground point. */
  tapToMove: boolean;
  /** Opt-in cloud save sync. Local play works with this off. */
  cloudSyncEnabled: boolean;
  /** Anonymous / Firebase account id used as the cloud document key. */
  cloudAccountId: string | null;
}

const KEY = "fish-shopping-settings";
const DEFAULTS: GameSettings = {
  muted: false,
  quality: "medium",
  joystickSide: "left",
  joystickScale: 1,
  tapToMove: false,
  cloudSyncEnabled: false,
  cloudAccountId: null,
};

function parseScale(v: unknown): JoystickScale {
  if (v === 0.75 || v === 1 || v === 1.25) return v;
  if (v === "0.75") return 0.75;
  if (v === "1.25") return 1.25;
  return 1;
}

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
      joystickSide: parsed.joystickSide === "right" ? "right" : "left",
      joystickScale: parseScale(parsed.joystickScale),
      tapToMove: typeof parsed.tapToMove === "boolean" ? parsed.tapToMove : DEFAULTS.tapToMove,
      cloudSyncEnabled: typeof parsed.cloudSyncEnabled === "boolean" ? parsed.cloudSyncEnabled : DEFAULTS.cloudSyncEnabled,
      cloudAccountId: typeof parsed.cloudAccountId === "string" && parsed.cloudAccountId.length > 0
        ? parsed.cloudAccountId
        : null,
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

/** Design-token base diameter (px / dp). */
export const JOYSTICK_BASE_DIAMETER = 140;
