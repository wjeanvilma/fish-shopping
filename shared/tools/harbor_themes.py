"""
Finish 2.0 Phase 19 — authored low-poly harbor theme props + palettes.

Each theme adds distinct decorative meshes (HarborArt_* nodes) and palette
overrides so ≥3 harbor GLBs are visibly non-blockout while keeping presenter
socket names unchanged.
"""
from __future__ import annotations

from glb_geometry import add_box, mesh_bounds

HARBOR_ART_MARKER = "authored-phase-19"
HARBOR_ART_MIN = 3

# Harbor id suffix → theme key (content-pack harbor.id after "harbor.").
AUTHORED_THEMES = {
    "sunrise_pier": "sunrise",
    "coral_lagoon": "coral",
    "storm_quay": "storm",
}


def _finish_prop(pos, nrm, idx):
    """Recenter on origin; keep absolute proportions (props are world-scaled later)."""
    (x0, y0, z0), (x1, y1, z1) = mesh_bounds(pos)
    cx, cy, cz = (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5
    out = [((x - cx), (y - cy), (z - cz)) for x, y, z in pos]
    return out, nrm, idx, mesh_bounds(out)


def prop_lantern():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.55, 0.0), (0.08, 1.10, 0.08))  # pole
    add_box(pos, nrm, idx, (0.0, 1.20, 0.0), (0.22, 0.18, 0.22))  # lamp
    add_box(pos, nrm, idx, (0.0, 1.32, 0.0), (0.26, 0.06, 0.26))  # cap
    return _finish_prop(pos, nrm, idx)


def prop_buoy():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.28, 0.0), (0.36, 0.40, 0.36))
    add_box(pos, nrm, idx, (0.0, 0.55, 0.0), (0.12, 0.28, 0.12))
    add_box(pos, nrm, idx, (0.0, 0.72, 0.0), (0.20, 0.08, 0.20))
    return _finish_prop(pos, nrm, idx)


def prop_bench():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.22, 0.0), (0.90, 0.08, 0.32))  # seat
    add_box(pos, nrm, idx, (0.0, 0.42, -0.12), (0.90, 0.28, 0.06))  # back
    add_box(pos, nrm, idx, (-0.38, 0.10, 0.0), (0.08, 0.20, 0.28))
    add_box(pos, nrm, idx, (0.38, 0.10, 0.0), (0.08, 0.20, 0.28))
    return _finish_prop(pos, nrm, idx)


def prop_bait_shed():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.45, 0.0), (0.85, 0.90, 0.70))
    add_box(pos, nrm, idx, (0.0, 1.00, 0.0), (0.95, 0.12, 0.80))  # roof
    add_box(pos, nrm, idx, (0.0, 0.55, 0.38), (0.35, 0.45, 0.06))  # door
    add_box(pos, nrm, idx, (0.28, 0.70, 0.38), (0.18, 0.18, 0.04))  # window
    return _finish_prop(pos, nrm, idx)


def prop_coral_stack():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.25, 0.0), (0.45, 0.50, 0.45))
    add_box(pos, nrm, idx, (-0.18, 0.65, 0.05), (0.18, 0.55, 0.18))
    add_box(pos, nrm, idx, (0.20, 0.55, -0.10), (0.16, 0.40, 0.16))
    add_box(pos, nrm, idx, (0.05, 0.85, 0.18), (0.14, 0.35, 0.14))
    add_box(pos, nrm, idx, (-0.05, 1.05, 0.0), (0.22, 0.12, 0.22))
    return _finish_prop(pos, nrm, idx)


def prop_reef_ring():
    pos, nrm, idx = [], [], []
    for ang_i, (x, z) in enumerate(((-0.35, 0.0), (0.35, 0.0), (0.0, -0.35), (0.0, 0.35))):
        add_box(pos, nrm, idx, (x, 0.18 + 0.04 * ang_i, z), (0.22, 0.28, 0.22))
    add_box(pos, nrm, idx, (0.0, 0.12, 0.0), (0.55, 0.10, 0.55))
    return _finish_prop(pos, nrm, idx)


def prop_breakwater():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.35, 0.0), (0.55, 0.70, 0.40))
    add_box(pos, nrm, idx, (0.0, 0.75, 0.0), (0.65, 0.18, 0.50))
    add_box(pos, nrm, idx, (-0.18, 0.20, 0.28), (0.20, 0.35, 0.18))
    add_box(pos, nrm, idx, (0.20, 0.25, 0.28), (0.22, 0.40, 0.18))
    return _finish_prop(pos, nrm, idx)


def prop_storm_lamp():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.70, 0.0), (0.10, 1.40, 0.10))
    add_box(pos, nrm, idx, (0.0, 1.45, 0.0), (0.28, 0.22, 0.28))
    add_box(pos, nrm, idx, (0.0, 1.60, 0.0), (0.36, 0.08, 0.36))
    add_box(pos, nrm, idx, (0.18, 1.20, 0.0), (0.35, 0.06, 0.06))  # arm
    return _finish_prop(pos, nrm, idx)


def prop_wind_vane():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.80, 0.0), (0.07, 1.60, 0.07))
    add_box(pos, nrm, idx, (0.15, 1.55, 0.0), (0.45, 0.06, 0.08))
    add_box(pos, nrm, idx, (-0.10, 1.55, 0.0), (0.18, 0.18, 0.04))
    add_box(pos, nrm, idx, (0.0, 1.70, 0.0), (0.12, 0.12, 0.12))
    return _finish_prop(pos, nrm, idx)


HARBOR_ART_BUILDERS = {
    "art_lantern": prop_lantern,
    "art_buoy": prop_buoy,
    "art_bench": prop_bench,
    "art_bait_shed": prop_bait_shed,
    "art_coral_stack": prop_coral_stack,
    "art_reef_ring": prop_reef_ring,
    "art_breakwater": prop_breakwater,
    "art_storm_lamp": prop_storm_lamp,
    "art_wind_vane": prop_wind_vane,
}

HARBOR_ART_COLORS = {
    "art_lantern": "#C4A35A",
    "art_buoy": "#D4543A",
    "art_bench": "#8B6914",
    "art_bait_shed": "#A67C52",
    "art_coral_stack": "#E07A8A",
    "art_reef_ring": "#3FA7A0",
    "art_breakwater": "#5A6670",
    "art_storm_lamp": "#3D4A55",
    "art_wind_vane": "#7A8590",
}

# Theme → list of (mesh_key, world xyz metres, uniform scale).
THEME_PLACEMENTS = {
    "sunrise": [
        ("art_lantern", (-6.5, 0.0, 1.2), 1.0),
        ("art_lantern", (-10.0, 0.0, -1.0), 1.05),
        ("art_bench", (2.5, 0.0, 2.0), 1.1),
        ("art_bait_shed", (5.5, 0.0, -5.5), 1.2),
        ("art_buoy", (-14.0, -0.2, 2.5), 0.9),
        ("art_buoy", (-15.5, -0.2, -1.8), 0.85),
    ],
    "coral": [
        ("art_coral_stack", (-8.0, -0.4, 3.0), 1.3),
        ("art_coral_stack", (-12.0, -0.35, -2.5), 1.1),
        ("art_coral_stack", (4.0, -0.3, 4.5), 0.95),
        ("art_reef_ring", (-15.0, -0.5, 0.5), 1.4),
        ("art_buoy", (-6.0, -0.15, 4.0), 0.8),
        ("art_buoy", (1.5, -0.15, 5.0), 0.75),
        ("art_lantern", (3.0, 0.0, -3.5), 0.95),
    ],
    "storm": [
        ("art_breakwater", (-16.0, -0.2, 4.0), 1.5),
        ("art_breakwater", (-16.5, -0.2, -3.5), 1.45),
        ("art_breakwater", (-18.0, -0.15, 0.5), 1.6),
        ("art_storm_lamp", (-5.0, 0.0, 2.0), 1.1),
        ("art_storm_lamp", (6.0, 0.0, -2.5), 1.05),
        ("art_wind_vane", (10.5, 0.0, -3.0), 1.2),
        ("art_buoy", (-14.5, -0.25, 5.5), 0.9),
    ],
}

THEME_PALETTE = {
    "sunrise": {
        "water": "#3A8FB8",
        "pier": "#C9A66B",
        "ground": "#8FA37A",
    },
    "coral": {
        "water": "#2BB8C4",
        "pier": "#E8B4A0",
        "ground": "#D4A574",
        "zone_fishing": "#7FE0D0",
    },
    "storm": {
        "water": "#2A4A68",
        "pier": "#6B737A",
        "ground": "#4A5560",
        "zone_fishing": "#5A8AA8",
    },
}


def theme_for_harbor(harbor_id: str) -> str | None:
    slug = harbor_id.split(".", 1)[-1]
    return AUTHORED_THEMES.get(slug)
