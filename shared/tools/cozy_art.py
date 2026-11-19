"""
Cozy art pass 5: stylized harbor builders on top of cozy_kit.

Modules (machines, counter) are authored in unit XZ ([-0.5, 0.5]^2) with Y in metres,
so the harbor generator scales XZ to the simulation footprint and keeps true heights.
Ground, pier, foam and props are authored directly in world metres per harbor.

Presentation-only: none of this changes walkable areas, zones or obstacles.
"""
from __future__ import annotations

import math

from cozy_kit import Mesh, Rng, mix, shade

COZY_ART_MARKER = "cozy-art-5"

# Finish 5.0 Phase 11 — atmosphere/cozy render depth lock on harbor GLBs.
ATMOSPHERE_FINISH5_MARKER = "atmosphere-5"

# Finish 6.0 Phase 11 — atmosphere/cozy render depth lock on harbor GLBs.
ATMOSPHERE_FINISH6_MARKER = "atmosphere-6"
ATMOSPHERE_FINISH6_HARBOR_MIN = 14

WOOD = "#B9875A"
WOOD_DARK = "#7A5636"
METAL = "#AEB8BF"
METAL_DARK = "#5B656D"
CREAM = "#F4EBDD"
RED = "#D9583B"
TEAL = "#2C9C9A"
GOLD = "#E8B04A"
LEAF = "#5E9C55"
ROCK = "#8C8F8A"
GLOW = "#FFD98A"


def _norm_y(mesh: Mesh) -> Mesh:
    """Shift so the lowest vertex sits on y=0 (unit XZ modules)."""
    lo, _ = mesh.bounds()
    if abs(lo[1]) > 1e-6:
        mesh.pos = [(x, round(y - lo[1], 4), z) for x, y, z in mesh.pos]
    return mesh


# --------------------------------------------------------------------------- machines

def _machine_base(m: Mesh, body: str, height: float) -> None:
    m.rbox((0, 0.05, 0), (0.98, 0.10, 0.92), 0.04, shade(body, 0.55), seg=1)          # plinth
    m.rbox((0, 0.10 + height / 2, 0), (0.92, height, 0.84), 0.07, body, seg=1,
           top=shade(body, 1.18))                                                      # body
    m.box((0, 0.10 + height * 0.55, -0.425), (0.70, 0.04, 0.012), shade(body, 0.7))  # front seam
    for x in (-0.3, 0.3):                                                              # feet
        m.cylinder((x, 0.0, -0.33), 0.05, 0.06, METAL_DARK, seg=8)


def _light(m: Mesh, x: float, y: float, z: float, color: str = "#7BE36B") -> None:
    m.sphere((x, y, z), 0.045, color, seg=8, rings=4)


def cutter(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.62)
    m.box((0, 0.76, 0.0), (0.98, 0.05, 0.42), "#3A3F44", top="#4A5056")              # conveyor belt
    for x in (-0.44, 0.44):
        m.cylinder((x, 0.73, -0.21), 0.05, 0.42, METAL_DARK, seg=8, axis="z")          # rollers
    m.rbox((0.12, 0.95, 0.05), (0.34, 0.34, 0.34), 0.06, shade(body, 0.85))          # blade housing
    m.cylinder((0.12, 0.98, -0.14), 0.15, 0.03, METAL, seg=14, axis="z", top_color="#DDE4E8")  # blade
    _light(m, -0.30, 0.86, -0.43)
    m.cylinder((-0.18, 0.86, -0.45), 0.035, 0.03, RED, seg=8, axis="z")               # stop button
    return _norm_y(m)


def smoker(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.85)
    m.rbox((0, 0.55, -0.42), (0.56, 0.52, 0.04), 0.03, shade(body, 0.7))             # door
    m.box((0, 0.66, -0.445), (0.26, 0.14, 0.01), "#F2A25A")                          # warm window
    m.cylinder((0.25, 0.95, 0.15), 0.09, 0.55, METAL_DARK, seg=10)                    # chimney
    m.cylinder((0.25, 1.50, 0.15), 0.13, 0.05, "#3A3F44", seg=10)                     # cap
    m.cylinder((-0.30, 0.55, -0.43), 0.03, 0.06, GOLD, seg=8, axis="z")               # handle
    return _norm_y(m)


def grill(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.70)
    m.box((0, 0.82, 0), (0.84, 0.03, 0.70), "#2D2A28")
    for i in range(7):
        m.box((-0.36 + i * 0.12, 0.85, 0), (0.025, 0.02, 0.66), "#8A8F93")            # bars
    m.rbox((0, 1.12, 0.33), (0.86, 0.46, 0.10), 0.04, shade(body, 0.85))             # hood back
    _light(m, 0.33, 0.62, -0.43, "#FF8A3D")
    return _norm_y(m)


def chiller(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.95)
    m.rbox((0, 0.60, -0.42), (0.70, 0.76, 0.04), 0.03, "#CFEFF7", top="#E8FAFF")    # glass door
    for y in (0.35, 0.55, 0.75):
        m.box((0, y, -0.40), (0.62, 0.015, 0.02), "#9FC8D4")                          # shelves
    for x in (-0.25, 0, 0.25):
        m.box((x, 1.07, 0.0), (0.12, 0.02, 0.6), METAL_DARK)                          # vents
    _light(m, 0.35, 0.98, -0.43, "#69C8FF")
    return _norm_y(m)


def fryer(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.68)
    m.box((0, 0.79, 0), (0.80, 0.03, 0.60), "#C98B2A")                               # oil
    for x in (-0.2, 0.2):
        m.box((x, 0.95, 0), (0.30, 0.18, 0.40), "#3A3F44")                            # baskets
        m.box((x, 1.07, -0.25), (0.04, 0.04, 0.22), "#3A3F44")                        # handles
    _light(m, 0.36, 0.60, -0.43, "#FFB347")
    return _norm_y(m)


def packer(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.60)
    m.box((0, 0.74, 0), (0.96, 0.04, 0.38), "#3A3F44")
    for i, (x, z) in enumerate(((-0.25, -0.05), (0.05, 0.08), (0.30, -0.06))):
        m.rbox((x, 0.88, z), (0.22, 0.22, 0.22), 0.02, "#C9A26B" if i % 2 else "#B58D57")  # cartons
    m.box((0, 1.0, 0.3), (0.70, 0.40, 0.06), shade(body, 0.85))
    _light(m, -0.33, 0.62, -0.43)
    return _norm_y(m)


def steamer(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.55)
    for i, y in enumerate((0.70, 0.86, 1.02)):
        m.cylinder((0, y, 0), 0.30, 0.15, "#D8B47A" if i % 2 else "#C9A065", seg=14)  # bamboo baskets
    m.cylinder((0, 1.17, 0), 0.31, 0.04, "#B88E55", seg=14, radius_top=0.10)         # lid
    return _norm_y(m)


def kiln(body: str) -> Mesh:
    m = Mesh()
    m.rbox((0, 0.05, 0), (0.98, 0.10, 0.92), 0.04, shade(body, 0.55), seg=1)
    m.sphere((0, 0.40, 0), 0.47, body, seg=12, rings=8, squash=(1.0, 1.15, 0.92))
    m.rbox((0, 0.36, -0.40), (0.34, 0.30, 0.10), 0.08, "#FF9A42")                    # glowing mouth
    m.cylinder((0.18, 0.85, 0.12), 0.07, 0.40, shade(body, 0.7), seg=8)              # flue
    return _norm_y(m)


def press(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.50)
    for x in (-0.38, 0.38):
        m.cylinder((x, 0.6, 0), 0.04, 0.75, METAL, seg=8)                             # columns
    m.box((0, 1.35, 0), (0.86, 0.08, 0.30), METAL_DARK)                               # crown
    m.cylinder((0, 0.95, 0), 0.09, 0.40, METAL, seg=10)                               # piston
    m.box((0, 0.92, 0), (0.50, 0.05, 0.40), METAL_DARK)                               # plate
    return _norm_y(m)


def pickler(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.55)
    for i, x in enumerate((-0.28, 0.0, 0.28)):
        m.cylinder((x, 0.66, 0), 0.12, 0.34, "#8FCB86" if i != 1 else "#B6D98C", seg=10,
                   top_color="#D7C9A8")                                               # jars
        m.cylinder((x, 1.0, 0), 0.10, 0.05, "#7A5636", seg=10)                        # lids
    return _norm_y(m)


def braiser(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.55)
    m.cylinder((0, 0.66, 0), 0.34, 0.30, "#4A4642", seg=14)                           # pot
    m.cylinder((0, 0.96, 0), 0.36, 0.04, "#5A5650", seg=14, radius_top=0.30)          # lid
    m.sphere((0, 1.03, 0), 0.05, GOLD, seg=8, rings=4)                                 # knob
    return _norm_y(m)


def glazer(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.58)
    m.cylinder((-0.375, 0.86, 0.25), 0.22, 0.75, "#C9874A", seg=12, axis="x", caps=True)   # drum
    for x in (-0.2, 0.0, 0.2):
        m.box((x, 0.70, -0.1), (0.04, 0.12, 0.04), "#E0A050")                         # drips
    _light(m, 0.34, 0.60, -0.43, "#FFC857")
    return _norm_y(m)


def poacher(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.55)
    m.cylinder((0, 0.64, 0), 0.36, 0.28, "#4A7A88", seg=14)                           # bath
    m.cylinder((0, 0.90, 0), 0.38, 0.04, "#5A8A98", seg=14, radius_top=0.32)          # lid
    for x in (-0.18, 0.18):
        m.box((x, 0.78, 0), (0.04, 0.22, 0.40), "#D0D8E0")                            # rack rails
    return _norm_y(m)


def canner(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.58)
    m.cylinder((0, 0.70, 0), 0.32, 0.70, "#8A6A48", seg=14)                           # retort
    m.cylinder((0, 1.08, 0), 0.28, 0.08, "#6A5040", seg=12)                           # lid band
    m.sphere((0.30, 0.78, 0.20), 0.07, GOLD, seg=8, rings=4)                           # gauge
    m.box((0, 0.55, 0.36), (0.28, 0.28, 0.14), "#C4A070")                             # can chute
    return _norm_y(m)


def roaster(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.58)
    m.box((0, 0.70, 0), (0.70, 0.55, 0.55), "#B05A38")                                # oven
    m.box((0, 0.95, 0), (0.60, 0.08, 0.45), "#8A4028")                                # door band
    for x in (-0.18, 0.18):
        m.box((x, 1.10, 0), (0.05, 0.06, 0.42), "#D0C0A0")                            # spit rails
    m.box((0, 0.38, 0), (0.50, 0.08, 0.40), "#E07030")                                # ember tray
    return _norm_y(m)


def fermenter(body: str) -> Mesh:
    m = Mesh()
    _machine_base(m, body, 0.58)
    m.cylinder((0, 0.70, 0), 0.30, 0.70, "#6A7A50", seg=14)                           # crock
    m.cylinder((0, 1.08, 0), 0.26, 0.08, "#4A5A38", seg=12)                           # lid
    m.cylinder((0, 1.22, 0), 0.06, 0.18, "#C4D0B0", seg=8)                            # airlock
    m.box((0.32, 0.60, 0), (0.14, 0.35, 0.30), "#8A9A70")                             # brine shelf
    return _norm_y(m)


def counter(body: str) -> Mesh:
    """Market stall: wooden counter (worktop at 0.74 m) + striped awning on posts."""
    m = Mesh()
    m.rbox((0, 0.36, 0.05), (0.96, 0.70, 0.70), 0.05, body, seg=1, top=shade(body, 1.15))
    m.rbox((0, 0.725, 0.0), (1.00, 0.05, 0.80), 0.02, WOOD, seg=1, top=shade(WOOD, 1.12))  # worktop
    for i in range(5):                                                                # front slats
        m.box((-0.38 + i * 0.19, 0.36, -0.31), (0.15, 0.56, 0.02), shade(body, 0.88 + 0.06 * (i % 2)))
    for x in (-0.46, 0.46):                                                           # awning posts
        m.cylinder((x, 0.0, 0.36), 0.025, 2.05, WOOD_DARK, seg=8)
    stripes = 8
    for i in range(stripes):                                                          # sloped canopy
        x0 = -0.52 + i * (1.04 / stripes)
        col = RED if i % 2 == 0 else CREAM
        w = 1.04 / stripes
        # Winding: first quad faces up/front (+y, -z), second faces down (underside).
        m.quad((x0 + w, 2.05, 0.42), (x0 + w, 1.78, -0.42), (x0, 1.78, -0.42),
               (x0, 2.05, 0.42), (0, 0.95, -0.3), col, jitter=0.0, ao=None)
        m.quad((x0, 2.05, 0.42), (x0, 1.78, -0.42), (x0 + w, 1.78, -0.42),
               (x0 + w, 2.05, 0.42), (0, -0.95, 0.3), shade(col, 0.8), jitter=0.0, ao=None)
        m.box((x0 + w / 2, 1.72, -0.43), (w, 0.12, 0.02), col, jitter=0.0, ao=None)  # valance
    m.rbox((0, 1.30, 0.40), (0.42, 0.24, 0.04), 0.02, CREAM)                          # menu board
    m.box((0, 1.30, 0.375), (0.30, 0.03, 0.01), RED)
    return _norm_y(m)


MACHINE_BUILDERS = {
    "cutter": cutter, "smoker": smoker, "grill": grill, "chiller": chiller, "fryer": fryer,
    "packer": packer, "steamer": steamer, "kiln": kiln, "press": press, "pickler": pickler,
    "braiser": braiser, "glazer": glazer, "poacher": poacher, "canner": canner,
    "roaster": roaster, "fermenter": fermenter, "counter": counter,
}


def zone_pad() -> Mesh:
    """Soft rounded pad with a lighter rim (neutral; the zone material carries the colour)."""
    m = Mesh()
    m.rbox((0, 0.02, 0), (0.96, 0.04, 0.96), 0.018, "#E6E6E6", seg=1, ao=None, jitter=0.0)
    for (cx, cz, sx, sz) in ((0, -0.46, 0.96, 0.04), (0, 0.46, 0.96, 0.04), (-0.46, 0, 0.04, 0.88), (0.46, 0, 0.04, 0.88)):
        m.box((cx, 0.045, cz), (sx, 0.01, sz), "#FFFFFF", jitter=0.0, ao=None)
    return m


# --------------------------------------------------------------------------- ground / pier / foam

def ground(rect_mm: dict, base: str, rng: Rng) -> Mesh:
    """Tiled quay: painted 1 m tiles, cobble border band, stone kerb and a soil skirt to y=-1."""
    m = Mesh()
    x0, x1 = rect_mm["minX"] / 1000, rect_mm["maxX"] / 1000
    z0, z1 = rect_mm["minZ"] / 1000, rect_mm["maxZ"] / 1000
    path = mix(base, "#E9D9B4", 0.45)
    nx, nz = max(1, round((x1 - x0) / 1.2)), max(1, round((z1 - z0) / 1.2))
    dx, dz = (x1 - x0) / nx, (z1 - z0) / nz
    grid = []
    for i in range(nx + 1):
        row = []
        for j in range(nz + 1):
            px, pz = x0 + i * dx, z0 + j * dz
            edge = i <= 0 or j <= 0 or i >= nx or j >= nz
            n = rng.next()
            col = shade(path if edge else base, 0.9 + 0.18 * n)
            if not edge and n > 0.88:
                col = mix(col, "#7DAF5E", 0.4)  # grassy patch
            row.append(m._v((px, 0.0, pz), (0, 1, 0), m._tint(col, (px, 0, pz), 0.0, None)))
        grid.append(row)
    for i in range(nx):
        for j in range(nz):
            a, b, c, d = grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]
            m.idx += [a, b, c, a, c, d]
    # Kerb stones along the outside edge.
    stone = mix(ROCK, base, 0.25)
    for (sx, sz, ex, ez) in ((x0, z0, x1, z0), (x1, z0, x1, z1), (x1, z1, x0, z1), (x0, z1, x0, z0)):
        length = math.hypot(ex - sx, ez - sz)
        count = max(1, int(length / 1.8))
        for k in range(count):
            t0, t1 = k / count, (k + 1) / count
            cx = sx + (ex - sx) * (t0 + t1) / 2
            cz = sz + (ez - sz) * (t0 + t1) / 2
            along_x = abs(ex - sx) > abs(ez - sz)
            size = (length / count - 0.04, 0.16, 0.28) if along_x else (0.28, 0.16, length / count - 0.04)
            m.box((cx, -0.06, cz), size, shade(stone, 0.9 + 0.2 * rng.next()), jitter=0.04, ao=None)
    # Skirt walls down to the water.
    skirt = shade(mix(base, "#6E5A44", 0.6), 0.85)
    m.quad((x0, -1.0, z0), (x0, -0.12, z0), (x1, -0.12, z0), (x1, -1.0, z0), (0, 0, -1), skirt, ao=None)
    m.quad((x1, -1.0, z1), (x1, -0.12, z1), (x0, -0.12, z1), (x0, -1.0, z1), (0, 0, 1), skirt, ao=None)
    m.quad((x0, -1.0, z1), (x0, -0.12, z1), (x0, -0.12, z0), (x0, -1.0, z0), (-1, 0, 0), skirt, ao=None)
    m.quad((x1, -1.0, z0), (x1, -0.12, z0), (x1, -0.12, z1), (x1, -1.0, z1), (1, 0, 0), skirt, ao=None)
    return m


def pier(rect_mm: dict, wood: str, rng: Rng) -> Mesh:
    """Plank deck (top at y=0.04) with beams, round pilings and a rope rail."""
    m = Mesh()
    x0, x1 = rect_mm["minX"] / 1000, rect_mm["maxX"] / 1000
    z0, z1 = rect_mm["minZ"] / 1000, rect_mm["maxZ"] / 1000
    along_x = (x1 - x0) >= (z1 - z0)
    length = (x1 - x0) if along_x else (z1 - z0)
    plank_w = 0.26
    count = max(1, int(length / plank_w))
    for k in range(count):
        a = (x0 if along_x else z0) + k * (length / count)
        b = a + length / count - 0.025
        col = shade(wood, 0.86 + 0.24 * rng.next())
        if along_x:
            m.box(((a + b) / 2, 0.0, (z0 + z1) / 2), (b - a, 0.08, z1 - z0), col, jitter=0.03, ao=None)
        else:
            m.box(((x0 + x1) / 2, 0.0, (a + b) / 2), (x1 - x0, 0.08, b - a), col, jitter=0.03, ao=None)
    beam = shade(wood, 0.62)
    if along_x:
        for z in (z0 + 0.06, z1 - 0.06):
            m.box(((x0 + x1) / 2, -0.12, z), (x1 - x0, 0.14, 0.12), beam, ao=None)
    else:
        for x in (x0 + 0.06, x1 - 0.06):
            m.box((x, -0.12, (z0 + z1) / 2), (0.12, 0.14, z1 - z0), beam, ao=None)
    # Pilings + rope rail on both long edges.
    posts = max(2, int(length / 2.0) + 1)
    for side in (0, 1):
        tops = []
        for k in range(posts):
            t = k / (posts - 1)
            if along_x:
                px, pz = x0 + 0.12 + t * (length - 0.24), (z0 + 0.1) if side == 0 else (z1 - 0.1)
            else:
                px, pz = (x0 + 0.1) if side == 0 else (x1 - 0.1), z0 + 0.12 + t * (length - 0.24)
            m.cylinder((px, -1.3, pz), 0.11, 1.95, shade(WOOD_DARK, 0.9 + 0.2 * rng.next()), seg=8,
                       top_color=shade(WOOD, 1.05), ao=None)
            tops.append((px, 0.55, pz))
        for a, b in zip(tops, tops[1:]):
            mx, mz = (a[0] + b[0]) / 2, (a[2] + b[2]) / 2
            seg_len = math.hypot(b[0] - a[0], b[2] - a[2])
            if along_x:
                m.box((mx, 0.50, mz), (seg_len, 0.035, 0.035), "#D9C49A", jitter=0.0, ao=None)
            else:
                m.box((mx, 0.50, mz), (0.035, 0.035, seg_len), "#D9C49A", jitter=0.0, ao=None)
    return m


def foam_ring(rect_mm: dict, width: float = 0.55, skip_side: str | None = None) -> Mesh:
    """Flat translucent foam band hugging a rectangle at water level (alpha set by material)."""
    m = Mesh()
    x0, x1 = rect_mm["minX"] / 1000, rect_mm["maxX"] / 1000
    z0, z1 = rect_mm["minZ"] / 1000, rect_mm["maxZ"] / 1000
    y = -0.585
    w = width
    sides = {
        "south": ((x0 - w, z0 - w), (x1 + w, z0)),
        "north": ((x0 - w, z1), (x1 + w, z1 + w)),
        "west": ((x0 - w, z0), (x0, z1)),
        "east": ((x1, z0), (x1 + w, z1)),
    }
    # Alpha fades from the quay wall (1) to open water (0); corners stay transparent.
    fade = {
        "south": (0.0, 1.0, 1.0, 0.0),   # (ax,az) (ax,bz) (bx,bz) (bx,az): z0-w → z0
        "north": (1.0, 0.0, 0.0, 1.0),
        "west": (0.0, 0.0, 1.0, 1.0),
        "east": (1.0, 1.0, 0.0, 0.0),
    }
    for name, ((ax, az), (bx, bz)) in sides.items():
        if name == skip_side:
            continue
        m.quad((ax, y, az), (ax, y, bz), (bx, y, bz), (bx, y, az), (0, 1, 0), "#FFFFFF", jitter=0.0, ao=None,
               alphas=fade[name])
    return m


def burst_sparkle() -> Mesh:
    """Unit-size starburst (centre puff + ring of sparks) for pooled VfxBurst_* nodes."""
    m = Mesh()
    m.sphere((0, 0, 0), 0.32, "#FFFFFF", seg=8, rings=5, ao=None)
    for k in range(8):
        a = 2 * math.pi * k / 8
        m.sphere((math.cos(a) * 0.42, math.sin(a * 2) * 0.06, math.sin(a) * 0.42), 0.08, "#FFFFFF", seg=5, rings=3, ao=None)
    return m


# --------------------------------------------------------------------------- characters

def _limb(m: Mesh, x: float, y: float, z: float, w: float, h: float, color: str) -> None:
    m.rbox((x, y, z), (w, h, w), w * 0.45, color, seg=0, ao=None)


def _head(m: Mesh, y: float, skin: str, hair: str, hat: str | None, hat_kind: str = "beanie") -> None:
    m.sphere((0, y, 0), 0.17, skin, seg=9, rings=6, ao=None)
    m.sphere((0, y + 0.05, -0.02), 0.168, hair, seg=8, rings=5, squash=(1.0, 0.78, 1.0), ao=None)
    for x in (-0.06, 0.06):  # eyes (face +z)
        m.sphere((x, y + 0.02, 0.158), 0.024, "#2A2A2A", seg=5, rings=3, ao=None)
    if hat and hat_kind == "beanie":
        m.sphere((0, y + 0.09, 0), 0.18, hat, seg=8, rings=5, squash=(1.0, 0.7, 1.0), ao=None)
        m.cylinder((0, y + 0.02, 0), 0.185, 0.06, shade(hat, 0.85), seg=10, ao=None)
        m.sphere((0, y + 0.22, 0), 0.05, CREAM, seg=5, rings=3, ao=None)
    elif hat and hat_kind == "sunhat":
        m.cylinder((0, y + 0.08, 0), 0.30, 0.025, hat, seg=12, ao=None)
        m.cylinder((0, y + 0.10, 0), 0.15, 0.12, hat, seg=10, ao=None, top_color=shade(hat, 1.1))
    elif hat and hat_kind == "cap":
        m.sphere((0, y + 0.08, 0), 0.175, hat, seg=8, rings=5, squash=(1.0, 0.6, 1.0), ao=None)
        m.box((0, y + 0.06, 0.17), (0.20, 0.025, 0.12), hat, ao=None)


def character(center_y: float, height: float, coat: str, pants: str, skin: str, hair: str,
              hat: str | None, hat_kind: str, extra: str | None = None) -> Mesh:
    """Rounded chibi-proportioned character centred on the origin, spanning `height`."""
    m = Mesh()
    s = height / 1.6
    feet = -height / 2
    _limb(m, -0.10 * s, feet + 0.06 * s, 0.03 * s, 0.13 * s, 0.12 * s, "#3B3330")        # boots
    _limb(m, 0.10 * s, feet + 0.06 * s, 0.03 * s, 0.13 * s, 0.12 * s, "#3B3330")
    _limb(m, -0.10 * s, feet + 0.33 * s, 0.0, 0.14 * s, 0.44 * s, pants)                   # legs
    _limb(m, 0.10 * s, feet + 0.33 * s, 0.0, 0.14 * s, 0.44 * s, pants)
    m.rbox((0, feet + 0.82 * s, 0), (0.46 * s, 0.62 * s, 0.32 * s), 0.12 * s, coat, seg=1, ao=None)  # torso
    for x in (-0.29 * s, 0.29 * s):
        _limb(m, x, feet + 0.85 * s, 0.0, 0.12 * s, 0.46 * s, coat)                       # arms
        m.sphere((x, feet + 0.58 * s, 0.0), 0.065 * s, skin, seg=5, rings=3, ao=None)      # hands
    m.box((0, feet + 0.92 * s, 0.165 * s), (0.05 * s, 0.30 * s, 0.01), shade(coat, 0.75), ao=None)  # zip
    if extra == "apron":
        m.rbox((0, feet + 0.70 * s, 0.15 * s), (0.36 * s, 0.50 * s, 0.03), 0.01, CREAM, seg=1, ao=None)
    elif extra == "vest":
        m.rbox((0, feet + 0.90 * s, 0.155 * s), (0.40 * s, 0.30 * s, 0.03), 0.01, "#F5A623", seg=1, ao=None)
    elif extra == "bag":
        m.rbox((0.25 * s, feet + 0.66 * s, 0.06 * s), (0.10 * s, 0.22 * s, 0.18 * s), 0.03, "#C9A26B", seg=1, ao=None)
    elif extra == "crate":
        m.rbox((0, feet + 0.78 * s, -0.24 * s), (0.42 * s, 0.30 * s, 0.18 * s), 0.02, WOOD, seg=1, ao=None)
    _head(m, feet + 1.36 * s, skin, hair, hat, hat_kind)
    return m


def rod() -> Mesh:
    m = Mesh()
    m.cylinder((0, -0.55, 0), 0.025, 0.28, "#3B3330", seg=8, ao=None)                    # grip
    m.cylinder((0, -0.27, 0), 0.016, 1.35, "#8A5A34", seg=6, radius_top=0.008, ao=None)  # blank
    m.cylinder((0.03, -0.42, 0), 0.04, 0.03, METAL, seg=8, axis="x", ao=None)             # reel
    return m


SKINS = ["#F1C7A5", "#D9A07A", "#A8724F", "#7A4E35", "#E8B892"]
HAIRS = ["#3B2A20", "#6B4A2E", "#C9A15A", "#1E1A18", "#8A3B22"]


def character_builders() -> dict:
    """Replacement meshes for the harbor's PlayerBody / CustomerBody_N / WorkerBody_N sockets."""
    return {
        "player": lambda: character(0.8, 1.6, "#F2C230", "#1F3A52", SKINS[0], HAIRS[0], TEAL, "beanie"),
        "player_rod": rod,
        "customer_0": lambda: character(0.75, 1.5, "#D9583B", "#3E4A5C", SKINS[1], HAIRS[1], None, "", "bag"),
        "customer_1": lambda: character(0.75, 1.5, "#5B9BD5", "#5A4636", SKINS[4], HAIRS[2], "#F4E3B5", "sunhat"),
        "customer_2": lambda: character(0.75, 1.5, "#8E6BB8", "#2F3A40", SKINS[2], HAIRS[3], "#2F3A40", "cap"),
        "worker_fisher": lambda: character(0.78, 1.55, "#2F8F8C", "#2B3A42", SKINS[3], HAIRS[3], "#F2C230", "beanie"),
        "worker_porter": lambda: character(0.78, 1.55, "#8A6A45", "#3A3530", SKINS[1], HAIRS[4], "#D9583B", "cap", "crate"),
        "worker_operator": lambda: character(0.78, 1.55, "#4A78A8", "#2F3A40", SKINS[0], HAIRS[1], None, "", "apron"),
        "worker_generic": lambda: character(0.78, 1.55, "#4E7A5E", "#33302C", SKINS[2], HAIRS[0], None, "", "vest"),
    }


# --------------------------------------------------------------------------- items

def fish_item() -> Mesh:
    """Unit-length fish (length along +x), neutral so the 'fish' material tints it."""
    m = Mesh()
    m.sphere((0.05, 0, 0), 0.5, "#FFFFFF", seg=10, rings=6, squash=(0.78, 0.38, 0.22), ao=None)
    m.sphere((0.05, -0.06, 0), 0.5, "#F4F4F4", seg=8, rings=5, squash=(0.70, 0.22, 0.18), ao=None)  # belly
    m.cylinder((-0.42, 0, 0), 0.20, 0.22, "#D8D8D8", seg=6, radius_top=0.0, axis="x", ao=None)      # tail
    m.sphere((0.34, 0.06, 0.09), 0.045, "#1E1E1E", seg=6, rings=4, ao=None)
    m.sphere((0.34, 0.06, -0.09), 0.045, "#1E1E1E", seg=6, rings=4, ao=None)
    lo, hi = m.bounds()
    span = max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
    cx, cy, cz = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2
    m.pos = [(round((x - cx) / span, 4), round((y - cy) / span, 4), round((z - cz) / span, 4)) for x, y, z in m.pos]
    return m


def portion_item() -> Mesh:
    """Wrapped tray portion: white tray, tinted filling (material colour), paper band."""
    m = Mesh()
    m.rbox((0, -0.18, 0), (1.0, 0.25, 0.86), 0.08, "#FFFFFF", seg=1, ao=None)
    m.rbox((0, 0.04, 0), (0.82, 0.24, 0.66), 0.10, "#E9E9E9", seg=1, ao=None)
    m.box((0, 0.17, 0), (0.18, 0.02, 0.88), "#C9C9C9", ao=None)
    lo, hi = m.bounds()
    span = max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
    m.pos = [(round(x / span, 4), round((y - (lo[1] + hi[1]) / 2) / span, 4), round(z / span, 4)) for x, y, z in m.pos]
    return m


# --------------------------------------------------------------------------- props

def prop_lamp() -> tuple[Mesh, Mesh]:
    """Lamp post (post mesh) + glow mesh (separate so it can be emissive / toggled at night)."""
    post = Mesh()
    post.cylinder((0, 0, 0), 0.12, 0.12, "#3E4448", seg=10, ao=None)
    post.cylinder((0, 0.12, 0), 0.05, 2.1, "#3E4448", seg=8, ao=None)
    post.box((0.0, 2.24, 0.0), (0.30, 0.04, 0.30), "#3E4448", ao=None)
    post.cylinder((0, 2.26, 0), 0.20, 0.12, "#3E4448", seg=8, radius_top=0.02, ao=None)
    glow = Mesh()
    glow.rbox((0, 2.10, 0), (0.22, 0.26, 0.22), 0.05, GLOW, seg=1, jitter=0.0, ao=None)
    return post, glow


def prop_barrel() -> Mesh:
    m = Mesh()
    m.cylinder((0, 0, 0), 0.26, 0.70, "#9A6A3F", seg=12, top_color="#B98A5A", ao=0.85)
    for y in (0.12, 0.56):
        m.cylinder((0, y, 0), 0.268, 0.05, "#4E4A46", seg=12, caps=False, ao=None)
    return m


def prop_crates() -> Mesh:
    m = Mesh()
    for (x, y, z, s) in ((0, 0.25, 0, 0.5), (0.55, 0.22, 0.05, 0.44), (0.25, 0.70, 0.02, 0.42)):
        m.rbox((x, y, z), (s, s, s), 0.025, "#C49A62", seg=1, top="#D6B07A", ao=0.85)
        m.box((x, y, z - s / 2 - 0.005), (s * 0.9, s * 0.1, 0.01), "#8A6A40", ao=None)
    return m


def prop_fish_crate() -> Mesh:
    m = Mesh()
    m.rbox((0, 0.15, 0), (0.70, 0.30, 0.45), 0.03, "#5B8FB0", seg=1, ao=0.85)
    m.box((0, 0.30, 0), (0.62, 0.02, 0.38), "#DDEFF5")                                 # ice
    for i, x in enumerate((-0.18, 0.0, 0.18)):
        m.sphere((x, 0.34, -0.05 + 0.06 * (i % 2)), 0.16, "#8FB3C4", seg=8, rings=5,
                 squash=(1.0, 0.3, 0.4), ao=None)
    return m


def prop_rock(rng: Rng) -> Mesh:
    m = Mesh()
    for _ in range(3):
        r = rng.range(0.25, 0.55)
        m.sphere((rng.range(-0.3, 0.3), r * 0.3, rng.range(-0.3, 0.3)), r,
                 shade(ROCK, rng.range(0.85, 1.1)), seg=7, rings=5,
                 squash=(1.0, rng.range(0.55, 0.85), rng.range(0.8, 1.1)), jitter=0.06, ao=None)
    return m


def prop_bollard() -> Mesh:
    m = Mesh()
    m.cylinder((0, 0, 0), 0.13, 0.42, "#3E4448", seg=10, top_color="#55606A", ao=None)
    m.cylinder((0, 0.30, 0), 0.15, 0.04, "#D9C49A", seg=10, caps=False, ao=None)        # rope coil
    m.cylinder((0, 0.36, 0), 0.15, 0.04, "#D9C49A", seg=10, caps=False, ao=None)
    return m


def prop_planter(flower: str) -> Mesh:
    m = Mesh()
    m.rbox((0, 0.18, 0), (0.9, 0.36, 0.36), 0.04, "#A86B45", seg=1, top="#6B4A2E", ao=0.85)
    for i in range(5):
        x = -0.32 + i * 0.16
        m.sphere((x, 0.46, 0), 0.12, LEAF, seg=6, rings=4, ao=None)
        m.sphere((x + 0.03, 0.56, 0.04), 0.06, flower if i % 2 == 0 else "#FFF1C1", seg=5, rings=3, ao=None)
    return m


def prop_bench() -> Mesh:
    m = Mesh()
    for i in range(3):
        m.box((0, 0.42, -0.12 + i * 0.12), (1.3, 0.05, 0.10), shade(WOOD, 0.95 + 0.08 * i), ao=None)
    m.box((0, 0.72, 0.18), (1.3, 0.22, 0.05), WOOD, ao=None)
    for x in (-0.55, 0.55):
        m.box((x, 0.21, 0), (0.08, 0.42, 0.36), "#3E4448", ao=None)
    return m


def prop_boat(hull: str) -> Mesh:
    m = Mesh()
    m.sphere((0, 0.05, 0), 1.0, hull, seg=12, rings=6, squash=(1.35, 0.36, 0.55), ao=None)
    m.box((0, 0.20, 0), (2.4, 0.05, 0.85), "#B9875A", ao=None)                            # deck
    m.box((-0.3, 0.30, 0), (0.12, 0.10, 0.8), "#8A5A34", ao=None)                          # seat
    m.cylinder((0.6, 0.22, 0), 0.03, 1.6, "#6B4A2E", seg=6, ao=None)                       # mast
    m.quad((0.62, 0.55, 0.0), (0.62, 1.75, 0.0), (1.25, 0.55, 0.0), (1.25, 0.55, 0.0), (0, 0, -1),
           CREAM, jitter=0.0, ao=None)
    m.quad((1.25, 0.55, 0.0), (0.62, 1.75, 0.0), (0.62, 0.55, 0.0), (0.62, 0.55, 0.0), (0, 0, 1),
           CREAM, jitter=0.0, ao=None)
    return m


def prop_buoy() -> Mesh:
    m = Mesh()
    m.sphere((0, 0.15, 0), 0.32, RED, seg=10, rings=6, squash=(1, 0.8, 1), ao=None)
    m.cylinder((0, 0.25, 0), 0.33, 0.08, CREAM, seg=10, caps=False, ao=None)
    m.cylinder((0, 0.35, 0), 0.04, 0.5, "#3E4448", seg=6, ao=None)
    return m


def prop_umbrella_table(canopy: str) -> Mesh:
    m = Mesh()
    m.cylinder((0, 0, 0), 0.35, 0.05, "#E9E2D3", seg=12, ao=None)
    m.cylinder((0, 0.7, 0), 0.40, 0.04, "#E9E2D3", seg=12, ao=None)
    m.cylinder((0, 0.05, 0), 0.03, 2.0, "#8A8F93", seg=6, ao=None)
    m.cylinder((0, 1.85, 0), 0.95, 0.35, canopy, seg=10, radius_top=0.02, ao=None)
    return m
