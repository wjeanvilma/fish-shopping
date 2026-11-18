"""
Cozy art pass 5 — rounded, vertex-coloured rebuilds of the per-harbor theme props
(HarborArt_* nodes). Same keys as harbor_themes.HARBOR_ART_BUILDERS; every prop now
stands on its own base at y=0 (the old box props were recentred on the origin and so sat
half-buried in the quay).

Node names, placements and counts are unchanged, so harbor-art locks keep holding.
"""
from __future__ import annotations

import math

from cozy_art import CREAM, GLOW, GOLD, LEAF, METAL, METAL_DARK, RED, ROCK, TEAL, WOOD, WOOD_DARK
from cozy_kit import Mesh, Rng, shade

IRON = "#3E4448"


def _post(m: Mesh, x: float, z: float, h: float, color: str = IRON, r: float = 0.05) -> None:
    m.cylinder((x, 0, z), r * 2.2, 0.08, color, seg=8, ao=None)
    m.cylinder((x, 0.08, z), r, h - 0.08, color, seg=8, ao=None)


def _scaled(m: Mesh, k: float) -> Mesh:
    m.pos = [(round(x * k, 4), round(y * k, 4), round(z * k, 4)) for x, y, z in m.pos]
    return m


def lantern() -> Mesh:
    m = Mesh()
    _post(m, 0, 0, 1.15, WOOD_DARK, 0.045)
    m.box((0.12, 1.12, 0), (0.26, 0.04, 0.04), WOOD_DARK, ao=None)
    m.rbox((0.22, 0.95, 0), (0.18, 0.24, 0.18), 0.04, GLOW, seg=1, jitter=0.0, ao=None)
    m.cylinder((0.22, 1.07, 0), 0.13, 0.08, GOLD, seg=8, radius_top=0.02, ao=None)
    return m


def buoy() -> Mesh:
    m = Mesh()
    m.sphere((0, 0.15, 0), 0.34, RED, seg=10, rings=6, squash=(1, 0.8, 1), ao=None)
    m.cylinder((0, 0.24, 0), 0.35, 0.09, CREAM, seg=10, caps=False, ao=None)
    m.cylinder((0, 0.38, 0), 0.05, 0.55, IRON, seg=6, ao=None)
    m.sphere((0, 0.98, 0), 0.08, GOLD, seg=6, rings=4, ao=None)
    return m


def bench() -> Mesh:
    m = Mesh()
    for i in range(3):
        m.rbox((0, 0.44, -0.12 + i * 0.12), (1.3, 0.05, 0.10), 0.015, shade(WOOD, 0.95 + 0.07 * i), seg=0, ao=None)
    for i in range(2):
        m.rbox((0, 0.66 + i * 0.14, 0.20), (1.3, 0.09, 0.04), 0.015, WOOD, seg=0, ao=None)
    for x in (-0.55, 0.55):
        m.box((x, 0.22, 0), (0.07, 0.44, 0.38), IRON, ao=None)
        m.box((x, 0.62, 0.20), (0.06, 0.40, 0.05), IRON, ao=None)
    return m


def bait_shed() -> Mesh:
    m = Mesh()
    m.rbox((0, 0.75, 0), (1.8, 1.5, 1.3), 0.04, "#6FA4B8", seg=0, ao=0.8)  # scaled 0.75 below
    for i in range(7):                                                                   # clapboards
        m.box((0, 0.12 + i * 0.2, -0.655), (1.82, 0.03, 0.01), shade("#6FA4B8", 0.85), ao=None)
    m.box((0, 0.6, -0.66), (0.5, 1.1, 0.02), CREAM, ao=None)                            # door
    m.box((0.6, 0.95, -0.66), (0.36, 0.3, 0.02), "#FFE7A8", ao=None)                      # window
    # gable roof
    for s in (-1, 1):
        m.quad((-1.0, 1.5, 0.75 * s), (1.0, 1.5, 0.75 * s), (1.0, 2.05, 0), (-1.0, 2.05, 0),
               (0, 0.8, 0.6 * s), "#C8553D", jitter=0.03, ao=None)
        m.quad((1.0, 1.5, 0.75 * s), (-1.0, 1.5, 0.75 * s), (-1.0, 2.05, 0), (1.0, 2.05, 0),
               (0, 0.8, 0.6 * s), "#C8553D", jitter=0.03, ao=None)
    for x in (-0.9, 0.9):
        m.quad((x, 1.5, -0.65), (x, 1.5, 0.65), (x, 2.0, 0), (x, 2.0, 0), (1 if x > 0 else -1, 0, 0),
               "#6FA4B8", ao=None)
        m.quad((x, 1.5, 0.65), (x, 1.5, -0.65), (x, 2.0, 0), (x, 2.0, 0), (-1 if x > 0 else 1, 0, 0),
               "#6FA4B8", ao=None)
    m.rbox((0, 1.75, -0.7), (0.9, 0.22, 0.04), 0.02, CREAM, seg=0, ao=None)               # sign
    return _scaled(m, 0.75)


def coral_stack() -> Mesh:
    m = Mesh()
    rng = Rng(7)
    for i, c in enumerate(("#E07A8A", "#F2A65A", "#B86FC9", "#E07A8A", "#F2C230")):
        a = i * 1.3
        x, z = math.cos(a) * 0.25, math.sin(a) * 0.25
        h = rng.range(0.4, 0.9)
        m.cylinder((x, 0, z), 0.07, h, c, seg=6, radius_top=0.04, ao=None)
        m.sphere((x, h, z), 0.12, shade(c, 1.1), seg=6, rings=4, ao=None)
    m.sphere((0, 0.05, 0), 0.4, ROCK, seg=8, rings=4, squash=(1, 0.35, 1), ao=None)
    return m


def reef_ring() -> Mesh:
    m = Mesh()
    for i in range(10):
        a = i / 10 * math.tau
        m.sphere((math.cos(a) * 0.75, 0.05, math.sin(a) * 0.75), 0.22,
                 ("#3FA7A0", "#E07A8A", "#F2C230")[i % 3], seg=6, rings=4, squash=(1, 0.6, 1), ao=None)
    return m


def breakwater() -> Mesh:
    m = Mesh()
    rng = Rng(11)
    for i in range(6):
        r = rng.range(0.35, 0.55)
        m.sphere((-1.2 + i * 0.48, r * 0.35, rng.range(-0.2, 0.2)), r, shade("#7A8388", rng.range(0.85, 1.1)),
                 seg=7, rings=5, squash=(1.0, 0.7, 0.9), jitter=0.06, ao=None)
    return m


def storm_lamp() -> Mesh:
    m = Mesh()
    _post(m, 0, 0, 1.7, "#2F3A44", 0.06)
    m.rbox((0, 1.85, 0), (0.28, 0.32, 0.28), 0.05, GLOW, seg=1, jitter=0.0, ao=None)
    m.cylinder((0, 2.0, 0), 0.24, 0.14, "#2F3A44", seg=8, radius_top=0.03, ao=None)
    for dx, dz in ((0.14, 0), (-0.14, 0), (0, 0.14), (0, -0.14)):
        m.box((dx, 1.85, dz), (0.03 if dx else 0.30, 0.32, 0.03 if dz else 0.30), "#2F3A44", ao=None)
    return m


def wind_vane() -> Mesh:
    m = Mesh()
    _post(m, 0, 0, 2.0, METAL_DARK, 0.04)
    m.box((0, 1.95, 0), (0.7, 0.03, 0.03), METAL, ao=None)
    m.quad((0.3, 1.85, 0), (0.3, 2.1, 0), (0.55, 2.1, 0), (0.55, 1.85, 0), (0, 0, -1), RED, ao=None)
    m.quad((0.55, 1.85, 0), (0.55, 2.1, 0), (0.3, 2.1, 0), (0.3, 1.85, 0), (0, 0, 1), RED, ao=None)
    m.cylinder((-0.35, 1.95, 0), 0.06, 0.12, METAL, seg=6, radius_top=0.0, axis="x", ao=None)
    for i in range(4):
        a = i * math.pi / 2
        m.cylinder((0, 1.6, 0), 0.04, 0.12, GOLD, seg=6, ao=None)
        m.box((math.cos(a) * 0.12, 1.66, math.sin(a) * 0.12), (0.06, 0.06, 0.06), GOLD, ao=None)
    return m


def moon_lantern() -> Mesh:
    m = Mesh()
    _post(m, 0, 0, 1.3, "#4A5266", 0.045)
    m.sphere((0, 1.5, 0), 0.22, "#E3EAF8", seg=10, rings=6, ao=None)
    m.cylinder((0, 1.68, 0), 0.08, 0.08, "#4A5266", seg=8, ao=None)
    return m


def cove_rock() -> Mesh:
    m = Mesh()
    rng = Rng(5)
    for _ in range(4):
        r = rng.range(0.3, 0.6)
        m.sphere((rng.range(-0.35, 0.35), r * 0.45, rng.range(-0.3, 0.3)), r, shade("#7A8390", rng.range(0.85, 1.1)),
                 seg=7, rings=5, squash=(1.0, rng.range(0.6, 0.9), 0.9), jitter=0.06, ao=None)
    m.sphere((0.1, 0.65, 0.0), 0.2, LEAF, seg=6, rings=4, squash=(1, 0.4, 1), ao=None)    # moss
    return m


def obsidian_pylon() -> Mesh:
    m = Mesh()
    m.rbox((0, 0.12, 0), (0.6, 0.24, 0.6), 0.04, "#2A2E38", seg=0, ao=None)
    m.cylinder((0, 0.24, 0), 0.2, 1.4, "#1C1F28", seg=6, radius_top=0.08, ao=None)
    m.sphere((0, 1.7, 0), 0.12, "#B07BFF", seg=6, rings=4, ao=None)
    return m


def basalt_stack() -> Mesh:
    m = Mesh()
    for i, (x, z, h) in enumerate(((0, 0, 1.1), (0.28, 0.1, 0.8), (-0.25, 0.15, 0.6), (0.05, -0.28, 0.5))):
        m.cylinder((x, 0, z), 0.16, h, shade("#2A2E38", 1 + 0.08 * i), seg=6, top_color="#3A404C", ao=None)
    return m


def aurora_pole() -> Mesh:
    m = Mesh()
    _post(m, 0, 0, 1.9, "#3A4A5A", 0.045)
    for i, c in enumerate(("#7BE0C2", "#7BB8E0", "#B07BE0")):
        m.quad((0.05, 1.8 - i * 0.22, 0), (0.05, 1.95 - i * 0.22, 0), (0.6, 1.9 - i * 0.22, 0), (0.6, 1.75 - i * 0.22, 0),
               (0, 0, -1), c, ao=None)
        m.quad((0.6, 1.75 - i * 0.22, 0), (0.6, 1.9 - i * 0.22, 0), (0.05, 1.95 - i * 0.22, 0), (0.05, 1.8 - i * 0.22, 0),
               (0, 0, 1), c, ao=None)
    return m


def ice_marker() -> Mesh:
    m = Mesh()
    m.cylinder((0, 0, 0), 0.3, 0.9, "#B8D8F0", seg=6, radius_top=0.05, ao=None)
    m.cylinder((0.25, 0, 0.1), 0.15, 0.5, "#D8ECFA", seg=5, radius_top=0.03, ao=None)
    m.cylinder((0, 0.1, 0), 0.31, 0.07, RED, seg=6, caps=False, ao=None)
    return m


def bollard() -> Mesh:
    m = Mesh()
    m.cylinder((0, 0, 0), 0.14, 0.45, IRON, seg=10, top_color="#55606A", ao=None)
    m.sphere((0, 0.47, 0), 0.17, IRON, seg=8, rings=4, squash=(1, 0.5, 1), ao=None)
    m.cylinder((0, 0.22, 0), 0.16, 0.05, "#D9C49A", seg=10, caps=False, ao=None)
    m.cylinder((0, 0.29, 0), 0.16, 0.05, "#D9C49A", seg=10, caps=False, ao=None)
    return m


def flagpole() -> Mesh:
    m = Mesh()
    _post(m, 0, 0, 2.4, "#D8D4CC", 0.035)
    m.sphere((0, 2.42, 0), 0.06, GOLD, seg=6, rings=4, ao=None)
    for i in range(4):
        x0, x1 = 0.04 + i * 0.15, 0.04 + (i + 1) * 0.15
        y0 = 2.0 + 0.03 * math.sin(i)
        y1 = 2.0 + 0.03 * math.sin(i + 1)
        c = TEAL if i % 2 == 0 else CREAM
        m.quad((x0, y0, 0), (x0, y0 + 0.34, 0), (x1, y1 + 0.34, 0), (x1, y1, 0), (0, 0, -1), c, ao=None)
        m.quad((x1, y1, 0), (x1, y1 + 0.34, 0), (x0, y0 + 0.34, 0), (x0, y0, 0), (0, 0, 1), c, ao=None)
    return m


def planter() -> Mesh:
    m = Mesh()
    m.cylinder((0, 0, 0), 0.3, 0.4, "#B5653F", seg=10, radius_top=0.34, top_color="#5A3E2A", ao=0.85)
    m.cylinder((0, 0.36, 0), 0.355, 0.06, "#C9784E", seg=10, caps=False, ao=None)
    for i in range(6):
        a = i / 6 * math.tau
        m.sphere((math.cos(a) * 0.16, 0.5, math.sin(a) * 0.16), 0.13, LEAF, seg=6, rings=4, ao=None)
        m.sphere((math.cos(a) * 0.2, 0.6, math.sin(a) * 0.2), 0.06, "#F28BA8" if i % 2 else "#FFF1C1",
                 seg=5, rings=3, ao=None)
    m.sphere((0, 0.62, 0), 0.15, shade(LEAF, 1.1), seg=6, rings=4, ao=None)
    return m


def brazier() -> Mesh:
    m = Mesh()
    for a in (0, math.tau / 3, 2 * math.tau / 3):
        m.box((math.cos(a) * 0.18, 0.3, math.sin(a) * 0.18), (0.05, 0.6, 0.05), IRON, ao=None)
    m.cylinder((0, 0.55, 0), 0.22, 0.2, IRON, seg=10, radius_top=0.32, ao=None)
    m.sphere((0, 0.78, 0), 0.2, "#FF9A3C", seg=6, rings=4, squash=(1, 1.2, 1), ao=None)
    m.sphere((0.04, 0.9, 0.0), 0.11, "#FFE07A", seg=5, rings=3, squash=(1, 1.4, 1), ao=None)
    return m


def ash_crate() -> Mesh:
    m = Mesh()
    m.rbox((0, 0.25, 0), (0.6, 0.5, 0.48), 0.03, "#6A5A4E", seg=0, top="#4A3E36", ao=0.85)
    for y in (0.12, 0.38):
        m.box((0, y, -0.245), (0.62, 0.06, 0.01), "#3E342E", ao=None)
    m.sphere((0, 0.5, 0), 0.2, "#3A3634", seg=6, rings=4, squash=(1.3, 0.4, 1), ao=None)
    return m


def market_stall() -> Mesh:
    m = Mesh()
    m.rbox((0, 0.42, 0), (1.3, 0.84, 0.7), 0.04, WOOD, seg=0, top="#D6B07A", ao=0.82)
    for x in (-0.6, 0.6):
        for z in (-0.32, 0.32):
            m.box((x, 1.05, z), (0.06, 1.26, 0.06), WOOD_DARK, ao=None)
    stripes = 6
    for i in range(stripes):
        x0 = -0.75 + 1.5 * i / stripes
        x1 = -0.75 + 1.5 * (i + 1) / stripes
        c = RED if i % 2 == 0 else CREAM
        m.quad((x0, 1.68, 0.45), (x1, 1.68, 0.45), (x1, 1.92, -0.45), (x0, 1.92, -0.45), (0, 0.97, 0.26), c,
               jitter=0.0, ao=None)
        m.quad((x1, 1.68, 0.45), (x0, 1.68, 0.45), (x0, 1.92, -0.45), (x1, 1.92, -0.45), (0, -0.97, -0.26), c,
               jitter=0.0, ao=None)
    for i, c in enumerate(("#F2A65A", "#8FB3C4", "#E07A8A")):
        m.sphere((-0.35 + i * 0.35, 0.92, 0.05), 0.12, c, seg=6, rings=4, squash=(1.3, 0.5, 0.7), ao=None)
    return m


def canopy() -> Mesh:
    """Open market shade on four posts (roof at ~2.2 m, so it never hides a pad)."""
    m = Mesh()
    for x in (-0.7, 0.7):
        for z in (-0.45, 0.45):
            _post(m, x, z, 2.05, WOOD_DARK, 0.04)
    stripes = 7
    for i in range(stripes):
        x0 = -0.85 + 1.7 * i / stripes
        x1 = -0.85 + 1.7 * (i + 1) / stripes
        c = RED if i % 2 == 0 else CREAM
        for s in (-1, 1):
            m.quad((x0, 2.05, 0.6 * s), (x1, 2.05, 0.6 * s), (x1, 2.32, 0), (x0, 2.32, 0), (0, 0.9, 0.4 * s), c,
                   jitter=0.0, ao=None)
            m.quad((x1, 2.05, 0.6 * s), (x0, 2.05, 0.6 * s), (x0, 2.32, 0), (x1, 2.32, 0), (0, -0.9, -0.4 * s), c,
                   jitter=0.0, ao=None)
    return m


def crate_stack() -> Mesh:
    m = Mesh()
    for (x, y, z, s, c) in ((0, 0.24, 0, 0.48, "#C49A62"), (0.5, 0.21, 0.04, 0.42, "#B98A55"),
                            (0.22, 0.68, 0.0, 0.4, "#D0A870")):
        m.rbox((x, y, z), (s, s, s), 0.025, c, seg=0, top=shade(c, 1.1), ao=0.85)
        m.box((x, y, z - s / 2 - 0.005), (s * 0.9, s * 0.1, 0.01), "#8A6A40", ao=None)
    return m


def dock_ladder() -> Mesh:
    m = Mesh()
    for x in (-0.2, 0.2):
        m.cylinder((x, -0.6, 0), 0.03, 1.5, METAL, seg=6, ao=None)
        m.sphere((x, 0.9, 0), 0.05, METAL, seg=6, rings=4, ao=None)
    for y in (-0.4, -0.1, 0.2, 0.5):
        m.cylinder((-0.2, y, 0), 0.02, 0.4, METAL, seg=5, axis="x", ao=None)
    return m


def signal_bell() -> Mesh:
    m = Mesh()
    for x in (-0.3, 0.3):
        _post(m, x, 0, 1.6, WOOD_DARK, 0.045)
    m.rbox((0, 1.62, 0), (0.75, 0.08, 0.1), 0.02, WOOD_DARK, seg=0, ao=None)
    m.cylinder((0, 1.08, 0), 0.2, 0.34, GOLD, seg=10, radius_top=0.09, ao=None)
    m.sphere((0, 1.44, 0), 0.08, GOLD, seg=6, rings=4, ao=None)
    m.sphere((0, 1.04, 0), 0.05, IRON, seg=5, rings=3, ao=None)
    return m


def kelp_cluster() -> Mesh:
    m = Mesh()
    rng = Rng(3)
    for i in range(6):
        x, z = rng.range(-0.25, 0.25), rng.range(-0.25, 0.25)
        h = rng.range(0.6, 1.15)
        m.cylinder((x, -0.2, z), 0.06, h, shade("#3FA76A", rng.range(0.8, 1.15)), seg=5, radius_top=0.015, ao=None)
    return m


def crane_arm() -> Mesh:
    m = Mesh()
    m.rbox((0, 0.12, 0), (0.6, 0.24, 0.6), 0.04, "#E8B04A", seg=0, ao=None)
    m.box((0, 1.1, 0), (0.16, 1.8, 0.16), "#E8B04A", ao=None)
    m.box((0.6, 1.95, 0), (1.4, 0.14, 0.14), "#E8B04A", ao=None)
    m.box((-0.25, 1.95, 0), (0.3, 0.3, 0.3), IRON, ao=None)                                   # counterweight
    m.cylinder((1.15, 1.35, 0), 0.012, 0.6, IRON, seg=4, ao=None)
    m.rbox((1.15, 1.2, 0), (0.3, 0.24, 0.3), 0.03, "#8FB3C4", seg=0, ao=None)                  # crate on hook
    return m


def tide_gauge() -> Mesh:
    m = Mesh()
    m.rbox((0, 0.75, 0), (0.16, 1.5, 0.06), 0.02, CREAM, seg=0, ao=None)
    for i in range(7):
        m.box((0, 0.15 + i * 0.2, -0.035), (0.16 if i % 2 == 0 else 0.08, 0.03, 0.01), RED if i < 3 else IRON, ao=None)
    m.sphere((0, 1.58, 0), 0.08, GOLD, seg=6, rings=4, ao=None)
    return m


COZY_THEME_ART_BUILDERS = {
    "art_lantern": lantern,
    "art_buoy": buoy,
    "art_bench": bench,
    "art_bait_shed": bait_shed,
    "art_coral_stack": coral_stack,
    "art_reef_ring": reef_ring,
    "art_breakwater": breakwater,
    "art_storm_lamp": storm_lamp,
    "art_wind_vane": wind_vane,
    "art_moon_lantern": moon_lantern,
    "art_cove_rock": cove_rock,
    "art_obsidian_pylon": obsidian_pylon,
    "art_basalt_stack": basalt_stack,
    "art_aurora_pole": aurora_pole,
    "art_ice_marker": ice_marker,
    "art_bollard": bollard,
    "art_flagpole": flagpole,
    "art_planter": planter,
    "art_brazier": brazier,
    "art_ash_crate": ash_crate,
    "art_market_stall": market_stall,
    "art_canopy": canopy,
    "art_crate_stack": crate_stack,
    "art_dock_ladder": dock_ladder,
    "art_signal_bell": signal_bell,
    "art_kelp_cluster": kelp_cluster,
    "art_crane_arm": crane_arm,
    "art_tide_gauge": tide_gauge,
}
