"""
Phase 14 — authored pier / machine / counter module silhouettes.

Each module is built in local space with XZ footprint ≈ [-0.5, 0.5]² and Y in [0, 1]
(bottom on the deck). Harbor generation scales XZ to the sim footprint and Y to a
target height. Socket names (In_/Out_/Stock_/Zone_/Player/…) stay on the harbor GLB.
"""
from __future__ import annotations

from glb_geometry import add_box, mesh_bounds


def _finish(pos, nrm, idx):
    """Recenter XZ, lift Y so bottom is 0, normalize XZ span to 1 and Y span to 1."""
    (x0, y0, z0), (x1, y1, z1) = mesh_bounds(pos)
    cx, cz = (x0 + x1) * 0.5, (z0 + z1) * 0.5
    xz_span = max(x1 - x0, z1 - z0, 1e-6)
    y_span = max(y1 - y0, 1e-6)
    sx = 1.0 / xz_span
    sy = 1.0 / y_span
    out = [((x - cx) * sx, (y - y0) * sy, (z - cz) * sx) for x, y, z in pos]
    return out, nrm, idx, mesh_bounds(out)


def pier_deck_module():
    """Planked pier deck with edge beams and corner pilings."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.12, 0.0), (1.0, 0.12, 1.0))  # deck
    # plank ridges
    for x in (-0.35, -0.15, 0.05, 0.25, 0.40):
        add_box(pos, nrm, idx, (x, 0.19, 0.0), (0.06, 0.03, 0.96))
    # edge beams
    add_box(pos, nrm, idx, (0.0, 0.06, -0.48), (1.0, 0.10, 0.06))
    add_box(pos, nrm, idx, (0.0, 0.06, 0.48), (1.0, 0.10, 0.06))
    add_box(pos, nrm, idx, (-0.48, 0.06, 0.0), (0.06, 0.10, 0.90))
    add_box(pos, nrm, idx, (0.48, 0.06, 0.0), (0.06, 0.10, 0.90))
    # pilings
    for x, z in ((-0.42, -0.42), (-0.42, 0.42), (0.42, -0.42), (0.42, 0.42)):
        add_box(pos, nrm, idx, (x, -0.15, z), (0.10, 0.35, 0.10))
    return _finish(pos, nrm, idx)


def ground_module():
    """Beveled quay / shore slab."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.45, 0.0), (1.0, 0.90, 1.0))
    add_box(pos, nrm, idx, (0.0, 0.92, 0.0), (0.92, 0.06, 0.92))  # cap
    return _finish(pos, nrm, idx)


def zone_pad_module():
    """Thin interaction pad with raised rim (Zone_* sockets stay thin in world)."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.15, 0.0), (0.92, 0.08, 0.92))
    add_box(pos, nrm, idx, (0.0, 0.35, -0.46), (1.0, 0.12, 0.08))
    add_box(pos, nrm, idx, (0.0, 0.35, 0.46), (1.0, 0.12, 0.08))
    add_box(pos, nrm, idx, (-0.46, 0.35, 0.0), (0.08, 0.12, 0.84))
    add_box(pos, nrm, idx, (0.46, 0.35, 0.0), (0.08, 0.12, 0.84))
    return _finish(pos, nrm, idx)


def counter_module():
    """Retail counter: front panel, worktop, back shelf."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.35, 0.05), (0.95, 0.70, 0.55))  # body
    add_box(pos, nrm, idx, (0.0, 0.72, 0.0), (1.0, 0.08, 0.70))  # top
    add_box(pos, nrm, idx, (0.0, 0.40, -0.32), (0.90, 0.55, 0.08))  # front apron
    add_box(pos, nrm, idx, (0.0, 1.05, 0.28), (0.85, 0.45, 0.08))  # back shelf
    add_box(pos, nrm, idx, (-0.42, 0.85, 0.28), (0.08, 0.85, 0.08))
    add_box(pos, nrm, idx, (0.42, 0.85, 0.28), (0.08, 0.85, 0.08))
    return _finish(pos, nrm, idx)


def cutter_module():
    """Basic cutter: bench, blade housing, output chute."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.35, 0.0), (0.90, 0.70, 0.70))  # body
    add_box(pos, nrm, idx, (0.0, 0.78, 0.0), (0.95, 0.10, 0.75))  # deck
    add_box(pos, nrm, idx, (0.10, 1.05, 0.0), (0.35, 0.45, 0.35))  # housing
    add_box(pos, nrm, idx, (0.10, 1.15, 0.28), (0.08, 0.35, 0.25))  # blade hint
    add_box(pos, nrm, idx, (-0.35, 0.55, 0.35), (0.25, 0.20, 0.30))  # chute
    return _finish(pos, nrm, idx)


def smoker_module():
    """Smoker: cabinet + chimney + door panel."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.45, 0.0), (0.75, 0.90, 0.75))
    add_box(pos, nrm, idx, (0.0, 0.50, 0.40), (0.55, 0.55, 0.06))  # door
    add_box(pos, nrm, idx, (0.0, 1.05, 0.0), (0.80, 0.10, 0.80))  # lid
    add_box(pos, nrm, idx, (0.20, 1.35, -0.10), (0.18, 0.55, 0.18))  # chimney
    add_box(pos, nrm, idx, (0.20, 1.65, -0.10), (0.28, 0.08, 0.28))  # cap
    return _finish(pos, nrm, idx)


def grill_module():
    """Harbor grill: stand, grate, hood."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.25, 0.0), (0.85, 0.50, 0.70))  # stand
    add_box(pos, nrm, idx, (0.0, 0.55, 0.0), (0.95, 0.08, 0.80))  # grate deck
    for x in (-0.30, -0.10, 0.10, 0.30):
        add_box(pos, nrm, idx, (x, 0.62, 0.0), (0.05, 0.04, 0.70))
    add_box(pos, nrm, idx, (0.0, 0.95, -0.15), (0.90, 0.45, 0.35))  # hood
    add_box(pos, nrm, idx, (0.0, 1.25, -0.15), (0.25, 0.20, 0.25))  # vent
    return _finish(pos, nrm, idx)


def chiller_module():
    """Cold cabinet with frosted door and feet."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.50, 0.0), (0.80, 0.95, 0.70))
    add_box(pos, nrm, idx, (0.0, 0.55, 0.36), (0.65, 0.70, 0.06))  # glass door
    add_box(pos, nrm, idx, (0.0, 1.05, 0.0), (0.85, 0.08, 0.75))
    add_box(pos, nrm, idx, (-0.30, 0.06, -0.25), (0.12, 0.12, 0.12))
    add_box(pos, nrm, idx, (0.30, 0.06, -0.25), (0.12, 0.12, 0.12))
    add_box(pos, nrm, idx, (-0.30, 0.06, 0.25), (0.12, 0.12, 0.12))
    add_box(pos, nrm, idx, (0.30, 0.06, 0.25), (0.12, 0.12, 0.12))
    return _finish(pos, nrm, idx)


def fryer_module():
    """Fryer: oil well, basket rails, control panel."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.40, 0.0), (0.85, 0.80, 0.70))
    add_box(pos, nrm, idx, (0.0, 0.85, 0.0), (0.70, 0.12, 0.50))  # oil well
    add_box(pos, nrm, idx, (-0.22, 0.95, 0.0), (0.08, 0.25, 0.40))  # basket rail
    add_box(pos, nrm, idx, (0.22, 0.95, 0.0), (0.08, 0.25, 0.40))
    add_box(pos, nrm, idx, (0.0, 0.55, 0.38), (0.50, 0.25, 0.08))  # controls
    return _finish(pos, nrm, idx)


def packer_module():
    """Packing line: table, carton hopper, seal arm."""
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.35, 0.0), (0.95, 0.70, 0.75))  # table body
    add_box(pos, nrm, idx, (0.0, 0.75, 0.0), (1.0, 0.08, 0.80))  # top
    add_box(pos, nrm, idx, (-0.30, 1.05, 0.0), (0.35, 0.45, 0.45))  # hopper
    add_box(pos, nrm, idx, (0.30, 0.95, 0.0), (0.45, 0.12, 0.12))  # seal arm
    add_box(pos, nrm, idx, (0.45, 0.85, 0.0), (0.12, 0.30, 0.12))  # post
    return _finish(pos, nrm, idx)


MODULE_BUILDERS = {
    "pier": pier_deck_module,
    "ground": ground_module,
    "zone": zone_pad_module,
    "counter": counter_module,
    "cutter": cutter_module,
    "smoker": smoker_module,
    "grill": grill_module,
    "chiller": chiller_module,
    "fryer": fryer_module,
    "packer": packer_module,
}

MODULE_COLORS = {
    "pier": "#9A6B43",
    "ground": "#D9C9A3",
    "zone": "#7FC6E0",
    "counter": "#E8AF4A",
    "cutter": "#008F95",
    "smoker": "#8B4513",
    "grill": "#C45C26",
    "chiller": "#4A90A4",
    "fryer": "#D4A017",
    "packer": "#6B8F71",
}

# World Y height (metres) when node scale Y = height / 1.0 after normalize.
MODULE_HEIGHTS = {
    "pier": 0.28,
    "ground": 1.0,
    "zone": 0.04,
    "counter": 1.05,
    "cutter": 1.25,
    "smoker": 1.45,
    "grill": 1.35,
    "chiller": 1.40,
    "fryer": 1.30,
    "packer": 1.35,
}
