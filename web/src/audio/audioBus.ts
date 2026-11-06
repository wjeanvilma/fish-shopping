/**
 * Procedural Web Audio stingers (no bundled samples). Mute is presentation-only
 * and mirrors the Settings "Mute" toggle.
 */
import type { SfxCue } from "./sfxCues";

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

export class AudioBus {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Call from a user gesture so the browser unlocks AudioContext. */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
  }

  play(cue: SfxCue): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const tone of CUES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.value = tone.freq;
      const start = now + (tone.delay ?? 0);
      const peak = tone.gain ?? 0.08;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + tone.dur + 0.02);
    }
  }

  private ensure(): AudioContext {
    this.ctx ??= new AudioContext();
    return this.ctx;
  }
}
