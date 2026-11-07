/**
 * Phase 20 (post-1.0) — authored harbor/shop music beds + ducking helpers.
 * Finish 2.0 Phase 21 adds festival + storm beds; ducking policy unchanged.
 */
import musicPackJson from "../../../shared/audio/music-pack.json";

export type MusicBedId = "harbor" | "shop" | "festival" | "storm";

export interface MusicPackCatalog {
  phase: number;
  schema: string;
  sampleRate: number;
  sourceDir: string;
  webPublicDir: string;
  androidRawDir: string;
  loopDurationSec: number;
  maxBytesPerBed: number;
  maxTotalBytes: number;
  masterMusicScale: number;
  defaultBed: MusicBedId;
  beds: Array<{
    id: MusicBedId;
    file: string;
    androidRaw: string;
    role: string;
  }>;
  bedSwitch: {
    festivalWhen?: string[];
    stormWhen?: string[];
    shopWhen: string[];
    harborOtherwise: boolean;
  };
  ducking: {
    sfxDuckFactor: number;
    sfxDuckRecoveryMs: number;
    focusLossSilence: boolean;
    focusTransientCanDuckFactor: number;
    webHiddenSuspendsContext: boolean;
    respectMute: boolean;
    respectMusicVolume: boolean;
  };
  replacesProceduralAmbience: boolean;
}

export const musicPack = musicPackJson as unknown as MusicPackCatalog;
export const MUSIC_PACK_PHASE = musicPack.phase;
export const MUSIC_PACK_SCHEMA = musicPack.schema;
export const MUSIC_BED_IDS: readonly MusicBedId[] = musicPack.beds.map((b) => b.id);
export const MUSIC_PACK2_BED_IDS: readonly MusicBedId[] = ["festival", "storm"];

export function musicPublicPath(bed: MusicBedId): string {
  return `/music/${bed}.wav`;
}

/**
 * Resolve music bed from presentation context.
 * Priority: festival > storm > shop > harbor.
 */
export function musicBedForPanels(
  stationOpen: boolean,
  festivalActive = false,
  stormActive = false,
): MusicBedId {
  if (festivalActive) return "festival";
  if (stormActive) return "storm";
  return stationOpen ? "shop" : "harbor";
}

/** Apply SFX duck factor on top of the effective music gain. */
export function duckedMusicGain(
  baseGain: number,
  sfxDucking: boolean,
  factor = musicPack.ducking.sfxDuckFactor,
): number {
  if (baseGain <= 0) return 0;
  return sfxDucking ? baseGain * factor : baseGain;
}

/**
 * Focus-loss music scale.
 * - gain: full
 * - loss: silence
 * - duck: transient-can-duck factor
 */
export function focusMusicScale(
  state: "gain" | "loss" | "duck",
  duckFactor = musicPack.ducking.focusTransientCanDuckFactor,
): number {
  switch (state) {
    case "gain":
      return 1;
    case "duck":
      return duckFactor;
    case "loss":
    default:
      return 0;
  }
}
