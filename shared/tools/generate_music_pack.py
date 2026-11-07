#!/usr/bin/env python3
"""Phase 20 (post-1.0) — bake first-party authored music bed loops.

Writes seamless-ish mono PCM WAVs into shared/audio/music/, mirrors to
web/public/music/ and app/src/main/res/raw/music_*.wav.

Usage:
  python3 shared/tools/generate_music_pack.py
  npm run music:generate
"""
from __future__ import annotations

import json
import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "shared/audio/music-pack.json"


def clamp16(x: float) -> int:
    return max(-32768, min(32767, int(x * 32767.0)))


def write_wav(path: Path, samples: list[float], sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = b"".join(struct.pack("<h", clamp16(s)) for s in samples)
        wf.writeframes(frames)


def normalize(samples: list[float], peak: float = 0.78) -> list[float]:
    m = max((abs(x) for x in samples), default=1.0) or 1.0
    g = peak / m
    return [x * g for x in samples]


def harbor_bed(sr: int, seconds: float) -> list[float]:
    n = int(sr * seconds)
    out = [0.0] * n
    # Deterministic soft noise + fifth pad that loops by matching endpoints.
    last = 0.0
    for i in range(n):
        t = i / sr
        # Loop-friendly phase: exact cycles over the buffer.
        pad = (
            0.22 * math.sin(2 * math.pi * 110 * t)
            + 0.14 * math.sin(2 * math.pi * 165 * t)
            + 0.08 * math.sin(2 * math.pi * 220 * t)
        )
        # Brown-ish wash
        white = ((i * 1103515245 + 12345) & 0x7FFF) / 0x7FFF - 0.5
        last = (last + 0.018 * white) / 1.018
        wash = last * 0.45
        # Gentle swell (integer cycles)
        swell = 0.85 + 0.15 * math.sin(2 * math.pi * t / seconds)
        out[i] = (pad + wash) * swell * 0.55
    return normalize(out)


def shop_bed(sr: int, seconds: float) -> list[float]:
    n = int(sr * seconds)
    out = [0.0] * n
    for i in range(n):
        t = i / sr
        # Warm C major-ish triad pad (loop-aligned fundamentals).
        pad = (
            0.2 * math.sin(2 * math.pi * 130.81 * t)
            + 0.16 * math.sin(2 * math.pi * 164.81 * t)
            + 0.12 * math.sin(2 * math.pi * 196.0 * t)
            + 0.06 * math.sin(2 * math.pi * 261.63 * t)
        )
        pulse = 0.82 + 0.18 * math.sin(2 * math.pi * 2 * t / seconds)
        # Soft shop murmur
        murmur = 0.08 * math.sin(2 * math.pi * 55 * t + 0.4 * math.sin(2 * math.pi * 0.5 * t))
        out[i] = (pad * pulse + murmur) * 0.6
    return normalize(out)


RENDERERS = {
    "harbor": harbor_bed,
    "shop": shop_bed,
}


def main() -> int:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    if catalog["phase"] != 20:
        print(f"Expected music-pack phase 20, got {catalog['phase']}")
        return 1
    sr = int(catalog["sampleRate"])
    seconds = float(catalog["loopDurationSec"])
    source_dir = ROOT / catalog["sourceDir"]
    web_dir = ROOT / catalog["webPublicDir"]
    raw_dir = ROOT / catalog["androidRawDir"]
    source_dir.mkdir(parents=True, exist_ok=True)
    web_dir.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    for bed in catalog["beds"]:
        bid = bed["id"]
        render = RENDERERS.get(bid)
        if render is None:
            print(f"missing renderer for {bid}")
            return 1
        samples = render(sr, seconds)
        src = source_dir / bed["file"]
        write_wav(src, samples, sr)
        write_wav(web_dir / bed["file"], samples, sr)
        write_wav(raw_dir / f"{bed['androidRaw']}.wav", samples, sr)
        size = src.stat().st_size
        total += size
        if size > catalog["maxBytesPerBed"]:
            print(f"{bid} exceeds maxBytesPerBed ({size})")
            return 1
        print(f"  {bid}: {size} bytes, {seconds:.1f}s loop → {src.relative_to(ROOT)}")

    if total > catalog["maxTotalBytes"]:
        print(f"total {total} exceeds maxTotalBytes")
        return 1
    print(f"OK music pack generated ({len(catalog['beds'])} beds, {total} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
