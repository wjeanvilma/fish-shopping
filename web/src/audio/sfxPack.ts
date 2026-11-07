/**
 * Phase 19 (post-1.0) — authored SFX pack catalog.
 */
import sfxPackJson from "../../../shared/audio/sfx-pack.json";
import type { SfxCue } from "./sfxCues";

export interface SfxPackCue {
  id: SfxCue | string;
  file: string;
  androidRaw: string;
  role: string;
  haptic: boolean;
}

export interface SfxPackCatalog {
  phase: number;
  schema: string;
  sampleRate: number;
  sourceDir: string;
  webPublicDir: string;
  androidRawDir: string;
  maxBytesPerClip: number;
  maxTotalBytes: number;
  maxDurationMs: number;
  voiceCostPerClip: number;
  maxSfxVoices: number;
  busPolicy: {
    respectMute: boolean;
    respectSfxVolume: boolean;
    androidFocusSilence: boolean;
    webLifecycleSuspend: boolean;
    proceduralFallback: boolean;
    ambienceRemainsProceduralUntilPhase: number;
  };
  cues: SfxPackCue[];
  eventMap: Record<string, string>;
}

export const sfxPack = sfxPackJson as unknown as SfxPackCatalog;
export const SFX_PACK_PHASE = sfxPack.phase;
export const SFX_PACK_SCHEMA = sfxPack.schema;
