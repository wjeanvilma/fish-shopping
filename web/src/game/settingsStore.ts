/**
 * Presentation-only settings (not part of the parity save). Mute gates music+SFX;
 * music/SFX volumes and haptics are independent (Phase 17). Quality, accessibility,
 * and optional cloud sync are client-local.
 */
import { clampVolume, type VolumeStep } from "../audio/audioBus";
import { clampHudTextScale, type HudTextScale } from "../presenters/accessibility";

export type QualityPreset = "low" | "medium" | "high";
export type JoystickSide = "left" | "right";
/** Multiplier on the 140px design-token diameter. */
export type JoystickScale = 0.75 | 1 | 1.25;
export type { VolumeStep, HudTextScale };

export interface GameSettings {
  muted: boolean;
  /** Phase 17/20: music bed gain (0 / 0.35 / 0.7 / 1). */
  musicVolume: VolumeStep;
  /** Phase 17: SFX stinger gain (0 / 0.35 / 0.7 / 1). */
  sfxVolume: VolumeStep;
  /** Phase 17: catch/sale vibration (independent of mute). */
  hapticsEnabled: boolean;
  quality: QualityPreset;
  /** Bottom corner for the virtual stick. */
  joystickSide: JoystickSide;
  joystickScale: JoystickScale;
  /** When true, tapping the harbor walks toward that ground point. */
  tapToMove: boolean;
  /** Opt-in cloud save sync. Local play works with this off. */
  cloudSyncEnabled: boolean;
  /** Phase 27 in-dev HUD strip for abandon / wage / catch-share rates. */
  showBalanceStrip: boolean;
  /** Phase 10: snap camera/locomotion and skip transfer VFX. */
  reducedMotion: boolean;
  /** Phase 10: show toast captions for alerts and transactions. */
  captionsEnabled: boolean;
  /** Phase 19: HUD font scale (1 / 1.15 / 1.3). */
  hudTextScale: HudTextScale;
  /** Phase 19: shape glyphs beside colour status cues. */
  shapeCues: boolean;
  /** Phase 19: show Good/Perfect timing meter while casting. */
  timingAssist: boolean;
  /** Phase 25: opt-in privacy-safe analytics events. */
  analyticsConsent: boolean;
  /** Phase 25: true after the player answers the consent gate. */
  analyticsConsentDecided: boolean;
  /** Anonymous / Firebase account id used as the cloud document key. */
  cloudAccountId: string | null;
  /** Phase 22: Identity Toolkit refresh token for guest uid recovery. */
  cloudRefreshToken: string | null;
  /** Phase 24: equipped harbor banner cosmetic id (presentation-only). */
  equippedCosmeticId: string | null;
}

/** Presentation-only save / cloud status for the Settings panel. */
export interface SaveStatusView {
  persistent: boolean;
  lastSavedLabel: string;
  cloudEnabled: boolean;
  cloudAvailable: boolean;
  cloudLinked: boolean;
  /** Phase 25: offline push queue has a pending snapshot. */
  cloudPendingUpload: boolean;
}

const KEY = "fish-shopping-settings";
const DEFAULTS: GameSettings = {
  muted: false,
  musicVolume: 0.7,
  sfxVolume: 1,
  hapticsEnabled: true,
  quality: "medium",
  joystickSide: "left",
  joystickScale: 1,
  tapToMove: false,
  cloudSyncEnabled: false,
  showBalanceStrip: false,
  reducedMotion: false,
  captionsEnabled: true,
  hudTextScale: 1,
  shapeCues: false,
  timingAssist: false,
  analyticsConsent: false,
  analyticsConsentDecided: false,
  cloudAccountId: null,
  cloudRefreshToken: null,
  equippedCosmeticId: null,
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
      musicVolume: typeof parsed.musicVolume === "number" ? clampVolume(parsed.musicVolume) : DEFAULTS.musicVolume,
      sfxVolume: typeof parsed.sfxVolume === "number" ? clampVolume(parsed.sfxVolume) : DEFAULTS.sfxVolume,
      hapticsEnabled: typeof parsed.hapticsEnabled === "boolean" ? parsed.hapticsEnabled : DEFAULTS.hapticsEnabled,
      quality: parsed.quality === "low" || parsed.quality === "high" || parsed.quality === "medium"
        ? parsed.quality
        : DEFAULTS.quality,
      joystickSide: parsed.joystickSide === "right" ? "right" : "left",
      joystickScale: parseScale(parsed.joystickScale),
      tapToMove: typeof parsed.tapToMove === "boolean" ? parsed.tapToMove : DEFAULTS.tapToMove,
      cloudSyncEnabled: typeof parsed.cloudSyncEnabled === "boolean" ? parsed.cloudSyncEnabled : DEFAULTS.cloudSyncEnabled,
      showBalanceStrip: typeof parsed.showBalanceStrip === "boolean" ? parsed.showBalanceStrip : DEFAULTS.showBalanceStrip,
      reducedMotion: typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : DEFAULTS.reducedMotion,
      captionsEnabled: typeof parsed.captionsEnabled === "boolean" ? parsed.captionsEnabled : DEFAULTS.captionsEnabled,
      hudTextScale: typeof parsed.hudTextScale === "number" ? clampHudTextScale(parsed.hudTextScale) : DEFAULTS.hudTextScale,
      shapeCues: typeof parsed.shapeCues === "boolean" ? parsed.shapeCues : DEFAULTS.shapeCues,
      timingAssist: typeof parsed.timingAssist === "boolean" ? parsed.timingAssist : DEFAULTS.timingAssist,
      analyticsConsent: typeof parsed.analyticsConsent === "boolean" ? parsed.analyticsConsent : DEFAULTS.analyticsConsent,
      analyticsConsentDecided: typeof parsed.analyticsConsentDecided === "boolean"
        ? parsed.analyticsConsentDecided
        : DEFAULTS.analyticsConsentDecided,
      cloudAccountId: typeof parsed.cloudAccountId === "string" && parsed.cloudAccountId.length > 0
        ? parsed.cloudAccountId
        : null,
      cloudRefreshToken: typeof parsed.cloudRefreshToken === "string" && parsed.cloudRefreshToken.length > 0
        ? parsed.cloudRefreshToken
        : null,
      equippedCosmeticId: typeof parsed.equippedCosmeticId === "string" && parsed.equippedCosmeticId.length > 0
        ? parsed.equippedCosmeticId
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

/** Format a last-checkpoint age for the Settings save-status row. */
export function formatLastSavedLabel(lastCheckpointEpochMs: number | null, nowMs = Date.now()): string {
  if (lastCheckpointEpochMs == null) return "Not saved this session";
  const sec = Math.max(0, Math.trunc((nowMs - lastCheckpointEpochMs) / 1000));
  if (sec < 5) return "Saved just now";
  if (sec < 60) return `Saved ${sec}s ago`;
  const min = Math.trunc(sec / 60);
  if (min < 60) return `Saved ${min}m ago`;
  const h = Math.trunc(min / 60);
  return `Saved ${h}h ago`;
}
