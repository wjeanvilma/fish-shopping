/**
 * Phase 17 — layered Web Audio bus: harbor ambience + SFX stingers, independent
 * music/SFX gains, optional haptics, and a concurrent-voice cap. Mute is a
 * master audio gate (music + SFX); haptics stay independent.
 */
import { HAPTIC_CUES, type SfxCue } from "./sfxCues";

type Tone = { freq: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };

const CUES: Record<SfxCue, Tone[]> = {
  catch: [
    { freq: 520, dur: 0.06, type: "triangle", gain: 0.12 },
    { freq: 780, dur: 0.09, type: "triangle", gain: 0.1, delay: 0.05 },
  ],
  machine_done: [
    { freq: 340, dur: 0.05, type: "square", gain: 0.06 },
    { freq: 340, dur: 0.05, type: "square", gain: 0.06, delay: 0.08 },
  ],
  sale: [
    { freq: 880, dur: 0.05, type: "sine", gain: 0.1 },
    { freq: 1320, dur: 0.12, type: "sine", gain: 0.08, delay: 0.04 },
  ],
  abandon: [
    { freq: 420, dur: 0.1, type: "sawtooth", gain: 0.05 },
    { freq: 260, dur: 0.16, type: "sawtooth", gain: 0.04, delay: 0.08 },
  ],
  upgrade: [
    { freq: 523, dur: 0.07, type: "triangle", gain: 0.09 },
    { freq: 659, dur: 0.07, type: "triangle", gain: 0.09, delay: 0.06 },
    { freq: 784, dur: 0.12, type: "triangle", gain: 0.1, delay: 0.12 },
  ],
  rush: [
    { freq: 392, dur: 0.1, type: "square", gain: 0.07 },
    { freq: 494, dur: 0.1, type: "square", gain: 0.07, delay: 0.08 },
    { freq: 587, dur: 0.18, type: "square", gain: 0.08, delay: 0.16 },
  ],
};

/** Max concurrent oscillator voices for SFX (Phase 17). */
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

export function voicesForCue(cue: SfxCue): number {
  return CUES[cue]?.length ?? 0;
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
  private ambienceGain: GainNode | null = null;
  private ambienceSources: AudioScheduledSourceNode[] = [];
  private ambienceStarted = false;
  /** Phase 28: true after a user-gesture unlock (or when AudioContext is already running). */
  private unlocked = false;
  /** Phase 28: tab-hidden suspend — keep unlocked, silence the context until resume. */
  private suspendedForLifecycle = false;

  /** Apply presentation settings in one shot (hosts call after load / Settings). */
  applyLevels(levels: Partial<AudioBusLevels>): void {
    if (typeof levels.muted === "boolean") this.muted = levels.muted;
    if (typeof levels.musicVolume === "number") this.musicVolume = clampVolume(levels.musicVolume);
    if (typeof levels.sfxVolume === "number") this.sfxVolume = clampVolume(levels.sfxVolume);
    if (typeof levels.hapticsEnabled === "boolean") this.hapticsEnabled = levels.hapticsEnabled;
    this.refreshAmbienceGain();
    if (this.effectiveMusic() > 0) this.ensureAmbience();
    else this.stopAmbience();
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

  /** Call from a user gesture so the browser unlocks AudioContext. */
  unlock(): void {
    this.unlocked = true;
    if (this.suspendedForLifecycle) return;
    if (typeof AudioContext === "undefined") return;
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    if (this.effectiveMusic() > 0) this.ensureAmbience();
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
    if (this.effectiveMusic() > 0) this.ensureAmbience();
  }

  /** Test seam: currently reserved oscillator voices. */
  get activeVoiceCount(): number {
    return this.activeVoices;
  }

  play(cue: SfxCue): void {
    const sfxGain = this.effectiveSfx();
    if (sfxGain <= 0) {
      this.pulseHaptic(cue);
      return;
    }
    const tones = CUES[cue];
    const needed = tones.length;
    if (!canSpawnVoices(this.activeVoices, needed)) return;
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    if (this.effectiveMusic() > 0) this.ensureAmbience();
    const now = ctx.currentTime;
    this.activeVoices += needed;
    let released = 0;
    const releaseOne = () => {
      if (released >= needed) return;
      released += 1;
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.value = tone.freq;
      const start = now + (tone.delay ?? 0);
      const peak = (tone.gain ?? 0.08) * sfxGain;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = releaseOne;
      osc.start(start);
      osc.stop(start + tone.dur + 0.02);
    }
    this.pulseHaptic(cue);
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

  private refreshAmbienceGain(): void {
    if (!this.ambienceGain) return;
    const g = this.effectiveMusic() * 0.045;
    const ctx = this.ensure();
    this.ambienceGain.gain.setTargetAtTime(g, ctx.currentTime, 0.08);
  }

  private ensureAmbience(): void {
    if (this.ambienceStarted || this.effectiveMusic() <= 0) return;
    const ctx = this.ensure();
    const master = ctx.createGain();
    master.gain.value = this.effectiveMusic() * 0.045;
    master.connect(ctx.destination);
    this.ambienceGain = master;

    // Soft brown-ish noise bed (harbor wash).
    const seconds = 2;
    const frames = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 0.55;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    noise.connect(filter);
    filter.connect(master);
    noise.start();
    this.ambienceSources.push(noise);

    // Low water hum.
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = "sine";
    hum.frequency.value = 78;
    humGain.gain.value = 0.35;
    hum.connect(humGain);
    humGain.connect(master);
    hum.start();
    this.ambienceSources.push(hum);

    this.ambienceStarted = true;
  }

  private stopAmbience(): void {
    for (const src of this.ambienceSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // already stopped
      }
    }
    this.ambienceSources = [];
    if (this.ambienceGain) {
      try {
        this.ambienceGain.disconnect();
      } catch {
        // ignore
      }
    }
    this.ambienceGain = null;
    this.ambienceStarted = false;
  }

  private ensure(): AudioContext {
    this.ctx ??= new AudioContext();
    return this.ctx;
  }
}
