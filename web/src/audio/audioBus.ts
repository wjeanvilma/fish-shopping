/**
 * Phase 17 levels + Phase 19 authored SFX + Phase 20 harbor/shop music beds.
 * Mute gates music+SFX; SFX duck dips the bed; tab hide suspends the context.
 * Voice cap counts one stream per SFX clip.
 */
import {
  duckedMusicGain,
  MUSIC_BED_IDS,
  musicBedForPanels,
  musicPack,
  musicPublicPath,
  type MusicBedId,
} from "./musicBeds";
import { HAPTIC_CUES, SFX_CUES, sfxPublicPath, type SfxCue } from "./sfxCues";

/** Max concurrent authored SFX voices (Phase 17 / 19). */
export const MAX_SFX_VOICES = 6;

/** Discrete volume steps for Settings (Off / Low / Med / High). */
export const VOLUME_STEPS = [0, 0.35, 0.7, 1] as const;
export type VolumeStep = (typeof VOLUME_STEPS)[number];

export function clampVolume(v: number): VolumeStep {
  let best: VolumeStep = 1;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const step of VOLUME_STEPS) {
    const d = Math.abs(step - v);
    if (d < bestDist) {
      best = step;
      bestDist = d;
    }
  }
  return best;
}

/** Authored clips cost one voice each (Phase 19). */
export function voicesForCue(_cue: SfxCue): number {
  return 1;
}

/** Whether a cue can start without exceeding the voice budget. */
export function canSpawnVoices(active: number, needed: number, max = MAX_SFX_VOICES): boolean {
  if (needed <= 0) return false;
  return active + needed <= max;
}

export function effectiveSfxGain(muted: boolean, sfxVolume: number): number {
  if (muted) return 0;
  return Math.min(1, Math.max(0, sfxVolume));
}

export function effectiveMusicGain(muted: boolean, musicVolume: number): number {
  if (muted) return 0;
  return Math.min(1, Math.max(0, musicVolume));
}

export interface AudioBusLevels {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  hapticsEnabled: boolean;
}

export class AudioBus {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicVolume: VolumeStep = 0.7;
  private sfxVolume: VolumeStep = 1;
  private hapticsEnabled = true;
  private activeVoices = 0;
  private musicGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private currentBed: MusicBedId = musicPack.defaultBed;
  private musicStarted = false;
  private sfxDucking = false;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  /** Phase 28: true after a user-gesture unlock (or when AudioContext is already running). */
  private unlocked = false;
  /** Phase 28: tab-hidden suspend — keep unlocked, silence the context until resume. */
  private suspendedForLifecycle = false;
  private readonly sfxBuffers = new Map<SfxCue, AudioBuffer>();
  private readonly musicBuffers = new Map<MusicBedId, AudioBuffer>();
  private sfxLoadPromise: Promise<void> | null = null;
  private musicLoadPromise: Promise<void> | null = null;

  /** Apply presentation settings in one shot (hosts call after load / Settings). */
  applyLevels(levels: Partial<AudioBusLevels>): void {
    if (typeof levels.muted === "boolean") this.muted = levels.muted;
    if (typeof levels.musicVolume === "number") this.musicVolume = clampVolume(levels.musicVolume);
    if (typeof levels.sfxVolume === "number") this.sfxVolume = clampVolume(levels.sfxVolume);
    if (typeof levels.hapticsEnabled === "boolean") this.hapticsEnabled = levels.hapticsEnabled;
    this.refreshMusicGain();
    if (this.effectiveMusic() > 0) this.ensureMusic();
    else this.stopMusic();
  }

  setMuted(muted: boolean): void {
    this.applyLevels({ muted });
  }

  setMusicVolume(volume: number): void {
    this.applyLevels({ musicVolume: volume });
  }

  setSfxVolume(volume: number): void {
    this.applyLevels({ sfxVolume: volume });
  }

  setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  /** Phase 20: switch harbor ↔ shop bed (cross-restart with same gain policy). */
  setMusicBed(bed: MusicBedId): void {
    if (this.currentBed === bed && this.musicStarted) return;
    this.currentBed = bed;
    if (this.effectiveMusic() <= 0) return;
    this.stopMusic();
    this.ensureMusic();
  }

  /** Host helper: pick bed from station panel state. */
  syncMusicBedFromPanels(
    stationOpen: boolean,
    festivalActive = false,
    stormActive = false,
  ): void {
    this.setMusicBed(musicBedForPanels(stationOpen, festivalActive, stormActive));
  }

  get musicBed(): MusicBedId {
    return this.currentBed;
  }

  /** Call from a user gesture so the browser unlocks AudioContext. */
  unlock(): void {
    this.unlocked = true;
    if (this.suspendedForLifecycle) return;
    if (typeof AudioContext === "undefined") return;
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    void this.ensureSfxLoaded();
    void this.ensureMusicLoaded();
    if (this.effectiveMusic() > 0) this.ensureMusic();
  }

  /** Phase 28: whether a gesture (or running context) has unlocked Web Audio. */
  get isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Phase 28: suspend AudioContext while the tab is hidden (keeps unlock). */
  suspendForLifecycle(): void {
    this.suspendedForLifecycle = true;
    const ctx = this.ctx;
    if (ctx && ctx.state === "running") void ctx.suspend();
  }

  /** Phase 28: resume AudioContext after the tab is visible again (if unlocked). */
  resumeForLifecycle(): void {
    this.suspendedForLifecycle = false;
    if (!this.unlocked) return;
    if (typeof AudioContext === "undefined") return;
    const ctx = this.ctx;
    if (ctx && ctx.state === "suspended") void ctx.resume();
    if (this.effectiveMusic() > 0) this.ensureMusic();
  }

  /** Test seam: currently reserved SFX voices. */
  get activeVoiceCount(): number {
    return this.activeVoices;
  }

  /** Test seam: whether an authored SFX buffer is decoded. */
  hasBuffer(cue: SfxCue): boolean {
    return this.sfxBuffers.has(cue);
  }

  /** Test seam: whether a music bed buffer is decoded. */
  hasMusicBuffer(bed: MusicBedId): boolean {
    return this.musicBuffers.has(bed);
  }

  /** Test seam: SFX duck active. */
  get isSfxDucking(): boolean {
    return this.sfxDucking;
  }

  play(cue: SfxCue): void {
    const sfxGain = this.effectiveSfx();
    if (sfxGain <= 0) {
      this.pulseHaptic(cue);
      return;
    }
    const needed = voicesForCue(cue);
    if (!canSpawnVoices(this.activeVoices, needed)) return;
    if (typeof AudioContext === "undefined") {
      this.pulseHaptic(cue);
      return;
    }
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    if (this.effectiveMusic() > 0) this.ensureMusic();
    this.beginSfxDuck();
    void this.ensureSfxLoaded().then(() => {
      if (this.effectiveSfx() <= 0) return;
      if (!canSpawnVoices(this.activeVoices, needed)) return;
      const buffer = this.sfxBuffers.get(cue);
      if (!buffer) return;
      this.activeVoices += needed;
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = sfxGain * 0.85;
      src.buffer = buffer;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - needed);
      };
      src.start();
    });
    this.pulseHaptic(cue);
  }

  private beginSfxDuck(): void {
    this.sfxDucking = true;
    this.refreshMusicGain();
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => {
      this.sfxDucking = false;
      this.duckTimer = null;
      this.refreshMusicGain();
    }, musicPack.ducking.sfxDuckRecoveryMs);
  }

  private ensureSfxLoaded(): Promise<void> {
    if (this.sfxLoadPromise) return this.sfxLoadPromise;
    if (typeof AudioContext === "undefined" || typeof fetch !== "function") {
      this.sfxLoadPromise = Promise.resolve();
      return this.sfxLoadPromise;
    }
    const ctx = this.ensure();
    this.sfxLoadPromise = Promise.all(
      SFX_CUES.map(async (cue) => {
        if (this.sfxBuffers.has(cue)) return;
        const res = await fetch(sfxPublicPath(cue));
        if (!res.ok) throw new Error(`sfx fetch failed ${cue}: ${res.status}`);
        const raw = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(raw.slice(0));
        this.sfxBuffers.set(cue, buffer);
      }),
    ).then(() => undefined);
    return this.sfxLoadPromise;
  }

  private ensureMusicLoaded(): Promise<void> {
    if (this.musicLoadPromise) return this.musicLoadPromise;
    if (typeof AudioContext === "undefined" || typeof fetch !== "function") {
      this.musicLoadPromise = Promise.resolve();
      return this.musicLoadPromise;
    }
    const ctx = this.ensure();
    this.musicLoadPromise = Promise.all(
      (MUSIC_BED_IDS as readonly MusicBedId[]).map(async (bed) => {
        if (this.musicBuffers.has(bed)) return;
        const res = await fetch(musicPublicPath(bed));
        if (!res.ok) throw new Error(`music fetch failed ${bed}: ${res.status}`);
        const raw = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(raw.slice(0));
        this.musicBuffers.set(bed, buffer);
      }),
    ).then(() => undefined);
    return this.musicLoadPromise;
  }

  private pulseHaptic(cue: SfxCue): void {
    if (!this.hapticsEnabled || !HAPTIC_CUES.has(cue)) return;
    const nav = globalThis.navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
    if (typeof nav?.vibrate === "function") {
      nav.vibrate(cue === "sale" ? 35 : 28);
    }
  }

  private effectiveSfx(): number {
    return effectiveSfxGain(this.muted, this.sfxVolume);
  }

  private effectiveMusic(): number {
    return effectiveMusicGain(this.muted, this.musicVolume);
  }

  private refreshMusicGain(): void {
    if (!this.musicGain) return;
    const base = this.effectiveMusic() * musicPack.masterMusicScale;
    const g = duckedMusicGain(base, this.sfxDucking, musicPack.ducking.sfxDuckFactor);
    const ctx = this.ensure();
    this.musicGain.gain.setTargetAtTime(Math.max(0.0001, g), ctx.currentTime, 0.05);
  }

  private ensureMusic(): void {
    if (this.musicStarted || this.effectiveMusic() <= 0) return;
    if (typeof AudioContext === "undefined") return;
    const ctx = this.ensure();
    void this.ensureMusicLoaded().then(() => {
      if (this.musicStarted || this.effectiveMusic() <= 0) return;
      const buffer = this.musicBuffers.get(this.currentBed);
      if (!buffer) return;
      const master = ctx.createGain();
      const base = this.effectiveMusic() * musicPack.masterMusicScale;
      master.gain.value = duckedMusicGain(base, this.sfxDucking, musicPack.ducking.sfxDuckFactor);
      master.connect(ctx.destination);
      this.musicGain = master;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(master);
      src.start();
      this.musicSource = src;
      this.musicStarted = true;
    });
  }

  private stopMusic(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch {
        // already stopped
      }
    }
    this.musicSource = null;
    if (this.musicGain) {
      try {
        this.musicGain.disconnect();
      } catch {
        // ignore
      }
    }
    this.musicGain = null;
    this.musicStarted = false;
  }

  private ensure(): AudioContext {
    this.ctx ??= new AudioContext();
    return this.ctx;
  }
}
