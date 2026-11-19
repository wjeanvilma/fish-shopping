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


def achievement_clip(sr: int) -> list[float]:
    notes = [(784.0, 0.0), (988.0, 0.05), (1175.0, 0.10), (1568.0, 0.16)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.12:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.12 * rate)), 0.05, 0.2, 0.35, 0.45)
            total += math.sin(2 * math.pi * freq * local) * e * 0.35
            total += math.sin(2 * math.pi * freq * 2 * local) * e * 0.08
        return total

    return synth(sr, 320, render)


def festival_clip(sr: int) -> list[float]:
    notes = [(523.25, 0.0), (659.25, 0.04), (783.99, 0.08), (1046.5, 0.12)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.14:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.14 * rate)), 0.04, 0.18, 0.4, 0.4)
            total += math.sin(2 * math.pi * freq * local) * e * 0.32
        sparkle = math.sin(2 * math.pi * 2093 * t) * env_adsr(i, n, 0.1, 0.3, 0.2, 0.5) * 0.1
        return total + sparkle

    return synth(sr, 300, render)


def contract_done_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        stamp = math.sin(2 * math.pi * 180 * t) * env_adsr(i, n, 0.02, 0.15, 0.2, 0.7) * 0.7
        settle = 0.0
        if t > 0.06:
            j = int((t - 0.06) * rate)
            e = env_adsr(j, max(1, n - int(0.06 * rate)), 0.04, 0.2, 0.35, 0.5)
            settle = math.sin(2 * math.pi * 880 * (t - 0.06)) * e * 0.4
        return stamp + settle

    return synth(sr, 240, render)


def contract_fail_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        e = env_adsr(i, n, 0.06, 0.25, 0.4, 0.4)
        freq = 280 - 90 * (i / max(1, n - 1))
        thud = math.sin(2 * math.pi * 90 * t) * math.exp(-t * 18) * 0.55
        return math.sin(2 * math.pi * freq * t) * e * 0.55 + thud

    return synth(sr, 280, render)


def goal_claim_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        e = env_adsr(i, n, 0.04, 0.2, 0.25, 0.55)
        return (
            math.sin(2 * math.pi * 880 * t) * e * 0.5
            + math.sin(2 * math.pi * 1320 * t) * e * 0.22
        )

    return synth(sr, 140, render)


def mastery_up_clip(sr: int) -> list[float]:
    notes = [(440.0, 0.0), (554.37, 0.07), (659.25, 0.14)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.15:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.15 * rate)), 0.06, 0.22, 0.4, 0.4)
            total += math.sin(2 * math.pi * freq * local) * e * 0.4
        return total

    return synth(sr, 300, render)


def quest_done_clip(sr: int) -> list[float]:
    notes = [(392.0, 0.0), (523.25, 0.08), (659.25, 0.16)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.16:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.16 * rate)), 0.05, 0.2, 0.45, 0.4)
            total += math.sin(2 * math.pi * freq * local) * e * 0.38
        return total

    return synth(sr, 340, render)


def rival_open_clip(sr: int) -> list[float]:
    notes = [(311.13, 0.0), (233.08, 0.07), (185.0, 0.14)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.14:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.14 * rate)), 0.04, 0.2, 0.35, 0.45)
            total += math.sin(2 * math.pi * freq * local) * e * 0.42
            total += 0.18 * math.sin(2 * math.pi * freq * 2 * local) * e
        return total

    return synth(sr, 300, render)


def rival_steal_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        e = env_adsr(i, n, 0.03, 0.2, 0.3, 0.5)
        freq = 720 - 380 * (i / max(1, n - 1))
        snatch = math.sin(2 * math.pi * freq * t) * e * 0.55
        noise = (((i * 7919) & 255) / 255 - 0.5) * math.exp(-t * 22) * 0.35
        return snatch + noise

    return synth(sr, 220, render)


def rival_beat_clip(sr: int) -> list[float]:
    notes = [(523.25, 0.0), (659.25, 0.06), (783.99, 0.12), (1046.5, 0.18)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.12:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.12 * rate)), 0.05, 0.2, 0.4, 0.4)
            total += math.sin(2 * math.pi * freq * local) * e * 0.36
        return total

    return synth(sr, 340, render)


def harbor_travel_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        horn = math.sin(2 * math.pi * 196 * t) * env_adsr(i, n, 0.08, 0.25, 0.4, 0.4) * 0.45
        horn2 = math.sin(2 * math.pi * 246.94 * t) * env_adsr(i, n, 0.1, 0.3, 0.3, 0.45) * 0.22
        white = ((i * 1103515245 + 12345) & 0x7FFF) / 0x7FFF - 0.5
        wash = white * math.exp(-t * 8) * 0.28
        return horn + horn2 + wash

    return synth(sr, 360, render)


def hire_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        click = math.sin(2 * math.pi * 1400 * t) * math.exp(-t * 40) * 0.45
        up = 0.0
        if t > 0.05:
            local = t - 0.05
            e = env_adsr(int(local * rate), max(1, n - int(0.05 * rate)), 0.05, 0.25, 0.3, 0.5)
            up = math.sin(2 * math.pi * 880 * local) * e * 0.4
        return click + up

    return synth(sr, 200, render)


def prestige_clip(sr: int) -> list[float]:
    notes = [(220.0, 0.0), (277.18, 0.08), (329.63, 0.16), (440.0, 0.24)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.18:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.18 * rate)), 0.08, 0.25, 0.45, 0.35)
            total += math.sin(2 * math.pi * freq * local) * e * 0.34
            total += 0.12 * math.sin(2 * math.pi * freq * 2 * local) * e
        return total

    return synth(sr, 400, render)


def loan_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        drawer = math.sin(2 * math.pi * 140 * t) * math.exp(-t * 18) * 0.55
        stamp = 0.0
        if t > 0.07:
            local = t - 0.07
            stamp = math.sin(2 * math.pi * 520 * local) * math.exp(-local * 28) * 0.4
        paper = (((i * 5011) & 255) / 255 - 0.5) * math.exp(-t * 12) * 0.2
        return drawer + stamp + paper

    return synth(sr, 260, render)


def trophy_set_clip(sr: int) -> list[float]:
    notes = [(987.77, 0.0), (1174.66, 0.05), (1318.51, 0.10), (1567.98, 0.16)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.11:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.11 * rate)), 0.03, 0.18, 0.3, 0.5)
            total += math.sin(2 * math.pi * freq * local) * e * 0.32
            total += math.sin(2 * math.pi * freq * 3 * local) * e * 0.06
        return total

    return synth(sr, 320, render)


def decor_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        hang = math.sin(2 * math.pi * 420 * t) * math.exp(-t * 22) * 0.45
        tap = 0.0
        if t > 0.05:
            local = t - 0.05
            tap = math.sin(2 * math.pi * 180 * local) * math.exp(-local * 30) * 0.35
        return hang + tap

    return synth(sr, 220, render)


def cosmetic_clip(sr: int) -> list[float]:
    notes = [(880.0, 0.0), (1174.66, 0.05), (1567.98, 0.11)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.12:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.12 * rate)), 0.04, 0.2, 0.35, 0.45)
            total += math.sin(2 * math.pi * freq * local) * e * 0.34
            total += math.sin(2 * math.pi * freq * 2 * local) * e * 0.08
        return total

    return synth(sr, 300, render)


def endgame_tier_clip(sr: int) -> list[float]:
    notes = [(196.0, 0.0), (246.94, 0.08), (293.66, 0.16), (392.0, 0.24)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.18:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.18 * rate)), 0.08, 0.25, 0.45, 0.35)
            total += math.sin(2 * math.pi * freq * local) * e * 0.36
        return total

    return synth(sr, 400, render)


def endgame_challenge_clip(sr: int) -> list[float]:
    notes = [(523.25, 0.0), (659.25, 0.06), (783.99, 0.12), (1046.5, 0.18)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.12:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.12 * rate)), 0.04, 0.2, 0.35, 0.45)
            total += math.sin(2 * math.pi * freq * local) * e * 0.32
        return total

    return synth(sr, 340, render)


def contract_accept_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        stamp = math.sin(2 * math.pi * 240 * t) * math.exp(-t * 28) * 0.5
        click = 0.0
        if t > 0.04:
            local = t - 0.04
            click = math.sin(2 * math.pi * 980 * local) * math.exp(-local * 35) * 0.3
        return stamp + click

    return synth(sr, 200, render)


def bait_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        box = math.sin(2 * math.pi * 160 * t) * math.exp(-t * 20) * 0.4
        plink = 0.0
        if t > 0.06:
            local = t - 0.06
            plink = math.sin(2 * math.pi * 1320 * local) * math.exp(-local * 32) * 0.35
        return box + plink

    return synth(sr, 220, render)


def full_unlock_clip(sr: int) -> list[float]:
    notes = [(261.63, 0.0), (329.63, 0.07), (392.0, 0.14), (523.25, 0.22), (659.25, 0.3)]

    def render(i, n, rate):
        t = i / rate
        total = 0.0
        for freq, delay in notes:
            local = t - delay
            if local < 0 or local > 0.14:
                continue
            e = env_adsr(int(local * rate), max(1, int(0.14 * rate)), 0.05, 0.22, 0.4, 0.4)
            total += math.sin(2 * math.pi * freq * local) * e * 0.3
        return total

    return synth(sr, 420, render)


def machine_break_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        clank = math.sin(2 * math.pi * 120 * t) * math.exp(-t * 16) * 0.55
        spark = (((i * 7919) & 255) / 255 - 0.5) * math.exp(-t * 18) * 0.35
        ping = 0.0
        if t > 0.05:
            local = t - 0.05
            ping = math.sin(2 * math.pi * 1760 * local) * math.exp(-local * 40) * 0.2
        return clank + spark + ping

    return synth(sr, 260, render)


def spoil_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        flop = math.sin(2 * math.pi * (180 - 60 * t) * t) * math.exp(-t * 10) * 0.45
        sigh = math.sin(2 * math.pi * (320 - 140 * t) * t) * env_adsr(i, n, 0.1, 0.3, 0.25, 0.45) * 0.3
        wet = (((i * 1103515245 + 12345) & 0x7FFF) / 0x7FFF - 0.5) * math.exp(-t * 9) * 0.2
        return flop + sigh + wet

    return synth(sr, 300, render)


def cast_strike_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        twang = math.sin(2 * math.pi * (420 + 180 * t) * t) * math.exp(-t * 14) * 0.55
        snap = math.sin(2 * math.pi * 980 * t) * math.exp(-t * 28) * 0.28
        wash = (((i * 7919) & 255) / 255 - 0.5) * math.exp(-t * 18) * 0.18
        return twang + snap + wash

    return synth(sr, 220, render)


def spoil_warn_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        warn = math.sin(2 * math.pi * (260 - 90 * t) * t) * env_adsr(i, n, 0.08, 0.25, 0.3, 0.4) * 0.4
        drip = (((i * 1103515245 + 12345) & 0x7FFF) / 0x7FFF - 0.5) * math.exp(-t * 8) * 0.22
        return warn + drip

    return synth(sr, 280, render)


def service_queue_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        tap = math.sin(2 * math.pi * 540 * t) * math.exp(-t * 22) * 0.35
        murmer = math.sin(2 * math.pi * 180 * t) * env_adsr(i, n, 0.1, 0.3, 0.35, 0.4) * 0.28
        if t > 0.08:
            local = t - 0.08
            tap += math.sin(2 * math.pi * 620 * local) * math.exp(-local * 24) * 0.25
        return tap + murmer

    return synth(sr, 260, render)


def contract_deadline_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        tick = math.sin(2 * math.pi * 880 * t) * math.exp(-t * 20) * 0.32
        low = math.sin(2 * math.pi * 140 * t) * env_adsr(i, n, 0.05, 0.2, 0.35, 0.45) * 0.38
        if t > 0.1:
            local = t - 0.1
            tick += math.sin(2 * math.pi * 990 * local) * math.exp(-local * 22) * 0.28
        return tick + low

    return synth(sr, 300, render)


def quest_near_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        chime = math.sin(2 * math.pi * 660 * t) * math.exp(-t * 12) * 0.35
        lift = math.sin(2 * math.pi * (440 + 120 * t) * t) * env_adsr(i, n, 0.06, 0.22, 0.4, 0.4) * 0.32
        spark = (((i * 9131) & 255) / 255 - 0.5) * math.exp(-t * 16) * 0.12
        return chime + lift + spark

    return synth(sr, 280, render)


def nest_settle_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        thump = math.sin(2 * math.pi * (120 - 30 * t) * t) * math.exp(-t * 10) * 0.42
        pad = math.sin(2 * math.pi * 196 * t) * env_adsr(i, n, 0.08, 0.28, 0.4, 0.4) * 0.28
        soft = (((i * 7331) & 255) / 255 - 0.5) * math.exp(-t * 14) * 0.1
        return thump + pad + soft

    return synth(sr, 300, render)


def roast_ready_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        chime = math.sin(2 * math.pi * 523.25 * t) * math.exp(-t * 11) * 0.36
        crackle = (((i * 1103515245 + 12345) & 0x7FFF) / 0x7FFF - 0.5) * math.exp(-t * 16) * 0.16
        warm = math.sin(2 * math.pi * (220 + 40 * t) * t) * env_adsr(i, n, 0.05, 0.2, 0.35, 0.45) * 0.26
        return chime + crackle + warm

    return synth(sr, 280, render)


def ferment_ready_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        bubble = math.sin(2 * math.pi * (280 + 90 * math.sin(t * 18)) * t) * math.exp(-t * 9) * 0.3
        ping = math.sin(2 * math.pi * 990 * t) * math.exp(-t * 22) * 0.22
        body = math.sin(2 * math.pi * 165 * t) * env_adsr(i, n, 0.1, 0.25, 0.35, 0.4) * 0.24
        return bubble + ping + body

    return synth(sr, 300, render)


def school_flash_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        shimmer = math.sin(2 * math.pi * (880 + 220 * t) * t) * math.exp(-t * 16) * 0.34
        splash = (((i * 9131) & 255) / 255 - 0.5) * math.exp(-t * 20) * 0.18
        lift = math.sin(2 * math.pi * 440 * t) * env_adsr(i, n, 0.04, 0.15, 0.3, 0.4) * 0.22
        return shimmer + splash + lift

    return synth(sr, 240, render)


def aurora_crest_clip(sr: int) -> list[float]:
    def render(i, n, rate):
        t = i / rate
        swell = math.sin(2 * math.pi * (330 + 80 * t) * t) * env_adsr(i, n, 0.12, 0.3, 0.45, 0.35) * 0.36
        shimmer = math.sin(2 * math.pi * 990 * t) * math.exp(-t * 8) * 0.18
        spark = (((i * 7919) & 255) / 255 - 0.5) * math.exp(-t * 12) * 0.1
        return swell + shimmer + spark

    return synth(sr, 340, render)


RENDERERS = {
    "catch": catch_clip,
    "machine_done": machine_done_clip,
    "sale": sale_clip,
    "ui": ui_clip,
    "abandon": abandon_clip,
    "upgrade": upgrade_clip,
    "rush": rush_clip,
    "achievement": achievement_clip,
    "festival": festival_clip,
    "contract_done": contract_done_clip,
    "contract_fail": contract_fail_clip,
    "goal_claim": goal_claim_clip,
    "mastery_up": mastery_up_clip,
    "quest_done": quest_done_clip,
    "rival_open": rival_open_clip,
    "rival_steal": rival_steal_clip,
    "rival_beat": rival_beat_clip,
    "harbor_travel": harbor_travel_clip,
    "hire": hire_clip,
    "prestige": prestige_clip,
    "loan": loan_clip,
    "trophy_set": trophy_set_clip,
    "decor": decor_clip,
    "cosmetic": cosmetic_clip,
    "endgame_tier": endgame_tier_clip,
    "endgame_challenge": endgame_challenge_clip,
    "contract_accept": contract_accept_clip,
    "bait": bait_clip,
    "full_unlock": full_unlock_clip,
    "machine_break": machine_break_clip,
    "spoil": spoil_clip,
    "cast_strike": cast_strike_clip,
    "spoil_warn": spoil_warn_clip,
    "service_queue": service_queue_clip,
    "contract_deadline": contract_deadline_clip,
    "quest_near": quest_near_clip,
    "nest_settle": nest_settle_clip,
    "roast_ready": roast_ready_clip,
    "ferment_ready": ferment_ready_clip,
    "school_flash": school_flash_clip,
    "aurora_crest": aurora_crest_clip,
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
