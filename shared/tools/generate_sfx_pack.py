#!/usr/bin/env python3
"""Phase 19 (post-1.0) — bake first-party authored SFX WAV clips.

Writes short mono PCM WAVs into shared/audio/sfx/, mirrors to web/public/sfx/
and app/src/main/res/raw/sfx_*.wav. Designs are intentional offline mixes
(not the old runtime single-oscillator blips).

Usage:
  python3 shared/tools/generate_sfx_pack.py
  npm run sfx:generate
"""
from __future__ import annotations

import json
import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "shared/audio/sfx-pack.json"


def clamp16(x: float) -> int:
    return max(-32768, min(32767, int(x * 32767.0)))


def env_adsr(i: int, n: int, a: float = 0.08, d: float = 0.18, s: float = 0.55, r: float = 0.35) -> float:
    if n <= 1:
        return 0.0
    t = i / (n - 1)
    if t < a:
        return t / a
    if t < a + d:
        return 1.0 - (1.0 - s) * ((t - a) / d)
    if t < 1.0 - r:
        return s
    return s * max(0.0, (1.0 - t) / r)


def synth(sample_rate: int, duration_ms: int, render) -> list[float]:
    n = max(1, int(sample_rate * duration_ms / 1000.0))
    out = [0.0] * n
    for i in range(n):
        out[i] = render(i, n, sample_rate)
    peak = max((abs(x) for x in out), default=1.0) or 1.0
    gain = 0.86 / peak
    return [x * gain for x in out]


def catch_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        e = env_adsr(i, n, 0.04, 0.2, 0.35, 0.45)
        splash = math.sin(2 * math.pi * (880 + 420 * t) * t) * e
        tick = math.sin(2 * math.pi * 210 * t) * env_adsr(i, n, 0.02, 0.15, 0.2, 0.6) * 0.35
        noise = ((i * 1103515245 + 12345) & 0x7FFF) / 0x7FFF - 0.5
        wash = noise * math.exp(-t * 14) * 0.22
        return splash * 0.7 + tick + wash

    return synth(sr, 180, render)


def machine_done_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        # two thunks ~80ms apart
        def thunk(offset: float, freq: float) -> float:
            local = t - offset
            if local < 0 or local > 0.07:
                return 0.0
            e = math.exp(-local * 48)
            return math.sin(2 * math.pi * freq * local) * e + (((i * 9131) & 255) / 255 - 0.5) * e * 0.4

        return thunk(0.0, 190) * 0.9 + thunk(0.08, 165) * 0.75

    return synth(sr, 200, render)


def sale_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        e1 = env_adsr(i, n, 0.03, 0.15, 0.4, 0.5)
        e2 = 0.0
        if t > 0.045:
            j = int((t - 0.045) * rate)
            e2 = env_adsr(j, max(1, n - int(0.045 * rate)), 0.03, 0.2, 0.35, 0.5)
        a = math.sin(2 * math.pi * 988 * t) * e1 * 0.55
        b = math.sin(2 * math.pi * 1480 * t) * e2 * 0.5
        shimmer = math.sin(2 * math.pi * 2960 * t) * e2 * 0.12
        return a + b + shimmer

    return synth(sr, 220, render)


def ui_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        e = env_adsr(i, n, 0.05, 0.25, 0.2, 0.55)
        return math.sin(2 * math.pi * 640 * t) * e * 0.55 + math.sin(2 * math.pi * 960 * t) * e * 0.2

    return synth(sr, 90, render)


def abandon_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        e = env_adsr(i, n, 0.08, 0.25, 0.45, 0.4)
        freq = 420 - 180 * (i / max(1, n - 1))
        return math.sin(2 * math.pi * freq * t) * e * 0.7 + math.sin(2 * math.pi * (freq * 0.5) * t) * e * 0.2

    return synth(sr, 260, render)


def upgrade_clip(sr: int) -> list[float]:
    notes = [(523.25, 0.0), (659.25, 0.06), (783.99, 0.12)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0:
                continue
            # short per-note envelope
            dur = 0.11
            if local > dur:
                continue
            e = env_adsr(int(local * rate), max(1, int(dur * rate)), 0.08, 0.2, 0.4, 0.4)
            total += math.sin(2 * math.pi * freq * local) * e * 0.42
        return total

    return synth(sr, 280, render)


def rush_clip(sr: int) -> list[float]:
    notes = [(392.0, 0.0), (493.88, 0.07), (587.33, 0.14)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.16:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.16 * rate)), 0.05, 0.2, 0.45, 0.4)
            # mild square-ish via odd harmonics
            wave = (
                math.sin(2 * math.pi * freq * local)
                + 0.28 * math.sin(2 * math.pi * freq * 3 * local)
            )
            total += wave * e * 0.38
        return total

    return synth(sr, 340, render)


RENDERERS = {
    "catch": catch_clip,
    "machine_done": machine_done_clip,
    "sale": sale_clip,
    "ui": ui_clip,
    "abandon": abandon_clip,
    "upgrade": upgrade_clip,
    "rush": rush_clip,
}


def write_wav(path: Path, samples: list[float], sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = b"".join(struct.pack("<h", clamp16(s)) for s in samples)
        wf.writeframes(frames)


def main() -> int:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    if catalog["phase"] != 19:
        print(f"Expected sfx-pack phase 19, got {catalog['phase']}")
        return 1
    sr = int(catalog["sampleRate"])
    source_dir = ROOT / catalog["sourceDir"]
    web_dir = ROOT / catalog["webPublicDir"]
    raw_dir = ROOT / catalog["androidRawDir"]
    source_dir.mkdir(parents=True, exist_ok=True)
    web_dir.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    for cue in catalog["cues"]:
        cid = cue["id"]
        render = RENDERERS.get(cid)
        if render is None:
            print(f"missing renderer for {cid}")
            return 1
        samples = render(sr)
        src = source_dir / cue["file"]
        write_wav(src, samples, sr)
        web = web_dir / cue["file"]
        write_wav(web, samples, sr)
        raw = raw_dir / f"{cue['androidRaw']}.wav"
        write_wav(raw, samples, sr)
        size = src.stat().st_size
        total += size
        if size > catalog["maxBytesPerClip"]:
            print(f"{cid} exceeds maxBytesPerClip ({size})")
            return 1
        dur_ms = len(samples) * 1000 / sr
        if dur_ms > catalog["maxDurationMs"]:
            print(f"{cid} exceeds maxDurationMs ({dur_ms:.1f})")
            return 1
        print(f"  {cid}: {size} bytes, {dur_ms:.0f} ms → {src.relative_to(ROOT)}")

    if total > catalog["maxTotalBytes"]:
        print(f"total {total} exceeds maxTotalBytes")
        return 1
    print(f"OK sfx pack generated ({len(catalog['cues'])} clips, {total} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
