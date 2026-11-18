"""
Finish 2.0 Phase 19 + Finish 3.0 Phase 8 + Finish 4.0 Phase 9/12 — authored harbor
theme props + scenic pass beyond grey-box blockout density.

Each theme adds distinct decorative meshes (HarborArt_* nodes) and palette
overrides so all harbor GLBs are visibly authored while keeping presenter
socket names unchanged. Phase 9 raises prop density / scenic accents so
scenes are no longer mere blockouts. Phase 12 adds Mist Cove + Prism Reach.
"""
from __future__ import annotations

from glb_geometry import add_box, mesh_bounds

HARBOR_ART_MARKER = "authored-finish-4.0-phase-9"
HARBOR_ART_MIN = 10
HARBOR_SCENIC_MARKER = "harbor-art-3"
HARBOR_SCENIC_MIN_NODES = 10

# Harbor id suffix → theme key (content-pack harbor.id after "harbor.").
AUTHORED_THEMES = {
    "sunrise_pier": "sunrise",
    "coral_lagoon": "coral",
    "storm_quay": "storm",
    "moon_cove": "moon",
    "obsidian_jetty": "obsidian",
    "northlight_harbor": "northlight",
    "grand_marina": "marina",
    "ember_wharf": "ember",
    "mist_cove": "mist",
    "prism_reach": "prism",
}


def _finish_prop(pos, nrm, idx):
    """Recenter on origin; keep absolute proportions (props are world-scaled later)."""
    (x0, y0, z0), (x1, y1, z1) = mesh_bounds(pos)
    cx, cy, cz = (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5
    out = [((x - cx), (y - cy), (z - cz)) for x, y, z in pos]
    return out, nrm, idx, mesh_bounds(out)


def prop_lantern():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.55, 0.0), (0.08, 1.10, 0.08))
    add_box(pos, nrm, idx, (0.0, 1.20, 0.0), (0.22, 0.18, 0.22))
    add_box(pos, nrm, idx, (0.0, 1.32, 0.0), (0.26, 0.06, 0.26))
    return _finish_prop(pos, nrm, idx)


def prop_buoy():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.28, 0.0), (0.36, 0.40, 0.36))
    add_box(pos, nrm, idx, (0.0, 0.55, 0.0), (0.12, 0.28, 0.12))
    add_box(pos, nrm, idx, (0.0, 0.72, 0.0), (0.20, 0.08, 0.20))
    return _finish_prop(pos, nrm, idx)


def prop_bench():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.22, 0.0), (0.90, 0.08, 0.32))
    add_box(pos, nrm, idx, (0.0, 0.42, -0.12), (0.90, 0.28, 0.06))
    add_box(pos, nrm, idx, (-0.38, 0.10, 0.0), (0.08, 0.20, 0.28))
    add_box(pos, nrm, idx, (0.38, 0.10, 0.0), (0.08, 0.20, 0.28))
    return _finish_prop(pos, nrm, idx)


def prop_bait_shed():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.45, 0.0), (0.85, 0.90, 0.70))
    add_box(pos, nrm, idx, (0.0, 1.00, 0.0), (0.95, 0.12, 0.80))
    add_box(pos, nrm, idx, (0.0, 0.55, 0.38), (0.35, 0.45, 0.06))
    add_box(pos, nrm, idx, (0.28, 0.70, 0.38), (0.18, 0.18, 0.04))
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
    add_box(pos, nrm, idx, (0.18, 1.20, 0.0), (0.35, 0.06, 0.06))
    return _finish_prop(pos, nrm, idx)


def prop_wind_vane():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.80, 0.0), (0.07, 1.60, 0.07))
    add_box(pos, nrm, idx, (0.15, 1.55, 0.0), (0.45, 0.06, 0.08))
    add_box(pos, nrm, idx, (-0.10, 1.55, 0.0), (0.18, 0.18, 0.04))
    add_box(pos, nrm, idx, (0.0, 1.70, 0.0), (0.12, 0.12, 0.12))
    return _finish_prop(pos, nrm, idx)


def prop_moon_lantern():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.60, 0.0), (0.07, 1.20, 0.07))
    add_box(pos, nrm, idx, (0.0, 1.30, 0.0), (0.30, 0.28, 0.30))
    add_box(pos, nrm, idx, (0.0, 1.48, 0.0), (0.18, 0.10, 0.18))
    add_box(pos, nrm, idx, (0.22, 1.30, 0.0), (0.08, 0.08, 0.08))
    return _finish_prop(pos, nrm, idx)


def prop_cove_rock():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.22, 0.0), (0.70, 0.40, 0.55))
    add_box(pos, nrm, idx, (-0.15, 0.48, 0.08), (0.35, 0.30, 0.30))
    add_box(pos, nrm, idx, (0.20, 0.40, -0.10), (0.28, 0.22, 0.28))
    return _finish_prop(pos, nrm, idx)


def prop_obsidian_pylon():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.70, 0.0), (0.28, 1.40, 0.28))
    add_box(pos, nrm, idx, (0.0, 1.45, 0.0), (0.38, 0.12, 0.38))
    add_box(pos, nrm, idx, (0.0, 0.12, 0.0), (0.42, 0.16, 0.42))
    return _finish_prop(pos, nrm, idx)


def prop_basalt_stack():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.20, 0.0), (0.50, 0.35, 0.45))
    add_box(pos, nrm, idx, (-0.10, 0.50, 0.05), (0.32, 0.40, 0.30))
    add_box(pos, nrm, idx, (0.15, 0.72, -0.05), (0.22, 0.35, 0.22))
    add_box(pos, nrm, idx, (0.0, 0.95, 0.0), (0.18, 0.18, 0.18))
    return _finish_prop(pos, nrm, idx)


def prop_aurora_pole():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.90, 0.0), (0.08, 1.80, 0.08))
    add_box(pos, nrm, idx, (0.0, 1.85, 0.0), (0.35, 0.10, 0.10))
    add_box(pos, nrm, idx, (0.0, 1.70, 0.0), (0.10, 0.10, 0.35))
    add_box(pos, nrm, idx, (0.0, 2.00, 0.0), (0.16, 0.16, 0.16))
    return _finish_prop(pos, nrm, idx)


def prop_ice_marker():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.35, 0.0), (0.25, 0.70, 0.25))
    add_box(pos, nrm, idx, (0.0, 0.80, 0.0), (0.40, 0.18, 0.18))
    add_box(pos, nrm, idx, (0.0, 0.10, 0.0), (0.45, 0.12, 0.45))
    return _finish_prop(pos, nrm, idx)


def prop_bollard():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.35, 0.0), (0.22, 0.70, 0.22))
    add_box(pos, nrm, idx, (0.0, 0.72, 0.0), (0.30, 0.10, 0.30))
    add_box(pos, nrm, idx, (0.0, 0.08, 0.0), (0.34, 0.10, 0.34))
    return _finish_prop(pos, nrm, idx)


def prop_flagpole():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 1.00, 0.0), (0.06, 2.00, 0.06))
    add_box(pos, nrm, idx, (0.22, 1.70, 0.0), (0.40, 0.28, 0.04))
    add_box(pos, nrm, idx, (0.0, 0.08, 0.0), (0.28, 0.12, 0.28))
    return _finish_prop(pos, nrm, idx)


def prop_planter():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.20, 0.0), (0.55, 0.35, 0.45))
    add_box(pos, nrm, idx, (0.0, 0.45, 0.0), (0.40, 0.20, 0.30))
    add_box(pos, nrm, idx, (-0.10, 0.65, 0.0), (0.12, 0.30, 0.12))
    add_box(pos, nrm, idx, (0.12, 0.60, 0.08), (0.10, 0.22, 0.10))
    return _finish_prop(pos, nrm, idx)


def prop_brazier():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.35, 0.0), (0.18, 0.70, 0.18))
    add_box(pos, nrm, idx, (0.0, 0.75, 0.0), (0.42, 0.14, 0.42))
    add_box(pos, nrm, idx, (0.0, 0.95, 0.0), (0.22, 0.28, 0.22))
    add_box(pos, nrm, idx, (0.0, 1.15, 0.0), (0.12, 0.18, 0.12))
    return _finish_prop(pos, nrm, idx)


def prop_ash_crate():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.28, 0.0), (0.55, 0.50, 0.45))
    add_box(pos, nrm, idx, (0.0, 0.55, 0.0), (0.60, 0.08, 0.50))
    add_box(pos, nrm, idx, (0.0, 0.35, 0.24), (0.20, 0.12, 0.04))
    return _finish_prop(pos, nrm, idx)


def prop_market_stall():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.45, 0.0), (1.20, 0.90, 0.70))
    add_box(pos, nrm, idx, (0.0, 1.05, 0.0), (1.35, 0.10, 0.85))
    add_box(pos, nrm, idx, (0.0, 1.25, 0.0), (1.40, 0.35, 0.90))
    add_box(pos, nrm, idx, (-0.55, 0.70, 0.38), (0.08, 1.20, 0.08))
    add_box(pos, nrm, idx, (0.55, 0.70, 0.38), (0.08, 1.20, 0.08))
    add_box(pos, nrm, idx, (0.0, 0.55, 0.40), (0.90, 0.08, 0.35))
    return _finish_prop(pos, nrm, idx)


def prop_canopy():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (-0.55, 0.70, 0.0), (0.08, 1.40, 0.08))
    add_box(pos, nrm, idx, (0.55, 0.70, 0.0), (0.08, 1.40, 0.08))
    add_box(pos, nrm, idx, (0.0, 1.45, 0.0), (1.40, 0.08, 0.90))
    add_box(pos, nrm, idx, (0.0, 1.55, 0.0), (1.50, 0.18, 1.00))
    return _finish_prop(pos, nrm, idx)


def prop_crate_stack():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.20, 0.0), (0.55, 0.35, 0.45))
    add_box(pos, nrm, idx, (0.05, 0.50, 0.05), (0.50, 0.30, 0.40))
    add_box(pos, nrm, idx, (-0.05, 0.78, -0.04), (0.45, 0.28, 0.38))
    return _finish_prop(pos, nrm, idx)


def prop_dock_ladder():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (-0.18, 0.55, 0.0), (0.06, 1.10, 0.06))
    add_box(pos, nrm, idx, (0.18, 0.55, 0.0), (0.06, 1.10, 0.06))
    for y in (0.20, 0.45, 0.70, 0.95):
        add_box(pos, nrm, idx, (0.0, y, 0.0), (0.42, 0.05, 0.05))
    return _finish_prop(pos, nrm, idx)


def prop_signal_bell():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.70, 0.0), (0.08, 1.40, 0.08))
    add_box(pos, nrm, idx, (0.0, 1.45, 0.0), (0.35, 0.08, 0.08))
    add_box(pos, nrm, idx, (0.22, 1.30, 0.0), (0.22, 0.22, 0.22))
    add_box(pos, nrm, idx, (0.22, 1.15, 0.0), (0.12, 0.12, 0.12))
    return _finish_prop(pos, nrm, idx)


def prop_kelp_cluster():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (-0.12, 0.40, 0.0), (0.10, 0.80, 0.10))
    add_box(pos, nrm, idx, (0.10, 0.50, 0.08), (0.09, 1.00, 0.09))
    add_box(pos, nrm, idx, (0.0, 0.55, -0.10), (0.08, 1.10, 0.08))
    add_box(pos, nrm, idx, (0.18, 0.35, -0.05), (0.08, 0.70, 0.08))
    return _finish_prop(pos, nrm, idx)


def prop_crane_arm():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.90, 0.0), (0.14, 1.80, 0.14))
    add_box(pos, nrm, idx, (0.55, 1.70, 0.0), (1.10, 0.12, 0.12))
    add_box(pos, nrm, idx, (1.05, 1.40, 0.0), (0.08, 0.55, 0.08))
    add_box(pos, nrm, idx, (1.05, 1.10, 0.0), (0.22, 0.18, 0.22))
    add_box(pos, nrm, idx, (0.0, 0.10, 0.0), (0.45, 0.16, 0.45))
    return _finish_prop(pos, nrm, idx)


def prop_tide_gauge():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.70, 0.0), (0.10, 1.40, 0.10))
    add_box(pos, nrm, idx, (0.12, 0.90, 0.0), (0.18, 0.08, 0.04))
    add_box(pos, nrm, idx, (0.12, 0.60, 0.0), (0.18, 0.08, 0.04))
    add_box(pos, nrm, idx, (0.12, 0.30, 0.0), (0.18, 0.08, 0.04))
    add_box(pos, nrm, idx, (0.0, 1.45, 0.0), (0.22, 0.12, 0.22))
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
    "art_moon_lantern": prop_moon_lantern,
    "art_cove_rock": prop_cove_rock,
    "art_obsidian_pylon": prop_obsidian_pylon,
    "art_basalt_stack": prop_basalt_stack,
    "art_aurora_pole": prop_aurora_pole,
    "art_ice_marker": prop_ice_marker,
    "art_bollard": prop_bollard,
    "art_flagpole": prop_flagpole,
    "art_planter": prop_planter,
    "art_brazier": prop_brazier,
    "art_ash_crate": prop_ash_crate,
    "art_market_stall": prop_market_stall,
    "art_canopy": prop_canopy,
    "art_crate_stack": prop_crate_stack,
    "art_dock_ladder": prop_dock_ladder,
    "art_signal_bell": prop_signal_bell,
    "art_kelp_cluster": prop_kelp_cluster,
    "art_crane_arm": prop_crane_arm,
    "art_tide_gauge": prop_tide_gauge,
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
    "art_moon_lantern": "#C8D4E8",
    "art_cove_rock": "#6A7380",
    "art_obsidian_pylon": "#1C1F28",
    "art_basalt_stack": "#2A2E38",
    "art_aurora_pole": "#7BE0C2",
    "art_ice_marker": "#B8D8F0",
    "art_bollard": "#B0A090",
    "art_flagpole": "#D8C4A0",
    "art_planter": "#5A8A4A",
    "art_brazier": "#E07030",
    "art_ash_crate": "#5A4A40",
    "art_market_stall": "#C4A070",
    "art_canopy": "#D4543A",
    "art_crate_stack": "#8B6914",
    "art_dock_ladder": "#6A7380",
    "art_signal_bell": "#C4A35A",
    "art_kelp_cluster": "#3FA76A",
    "art_crane_arm": "#5A6670",
    "art_tide_gauge": "#7A8590",
}

# Theme → list of (mesh_key, world xyz metres, uniform scale).
# Phase 9 scenic pass appends market/canopy/crane/ladder accents beyond blockout density.
THEME_PLACEMENTS = {
    "sunrise": [
        ("art_lantern", (-6.5, 0.0, 1.2), 1.0),
        ("art_lantern", (-10.0, 0.0, -1.0), 1.05),
        ("art_bench", (2.5, 0.0, 2.0), 1.1),
        ("art_bait_shed", (5.5, 0.0, -5.5), 1.2),
        ("art_buoy", (-14.0, -0.2, 2.5), 0.9),
        ("art_buoy", (-15.5, -0.2, -1.8), 0.85),
        ("art_market_stall", (7.5, 0.0, 1.5), 1.15),
        ("art_canopy", (1.0, 0.0, -4.0), 1.1),
        ("art_crate_stack", (4.0, 0.0, 2.8), 1.0),
        ("art_dock_ladder", (-13.0, -0.1, 0.5), 1.05),
        ("art_signal_bell", (-4.0, 0.0, -2.0), 0.95),
    ],
    "coral": [
        ("art_coral_stack", (-8.0, -0.4, 3.0), 1.3),
        ("art_coral_stack", (-12.0, -0.35, -2.5), 1.1),
        ("art_coral_stack", (4.0, -0.3, 4.5), 0.95),
        ("art_reef_ring", (-15.0, -0.5, 0.5), 1.4),
        ("art_buoy", (-6.0, -0.15, 4.0), 0.8),
        ("art_buoy", (1.5, -0.15, 5.0), 0.75),
        ("art_lantern", (3.0, 0.0, -3.5), 0.95),
        ("art_kelp_cluster", (-10.5, -0.45, 1.5), 1.2),
        ("art_kelp_cluster", (-4.5, -0.4, 5.0), 1.05),
        ("art_canopy", (6.0, 0.0, -1.5), 1.0),
        ("art_crate_stack", (2.0, 0.0, -4.5), 0.95),
        ("art_dock_ladder", (-14.0, -0.2, 2.5), 1.0),
    ],
    "storm": [
        ("art_breakwater", (-16.0, -0.2, 4.0), 1.5),
        ("art_breakwater", (-16.5, -0.2, -3.5), 1.45),
        ("art_breakwater", (-18.0, -0.15, 0.5), 1.6),
        ("art_storm_lamp", (-5.0, 0.0, 2.0), 1.1),
        ("art_storm_lamp", (6.0, 0.0, -2.5), 1.05),
        ("art_wind_vane", (10.5, 0.0, -3.0), 1.2),
        ("art_buoy", (-14.5, -0.25, 5.5), 0.9),
        ("art_crane_arm", (8.5, 0.0, 2.0), 1.15),
        ("art_tide_gauge", (-3.0, 0.0, -3.5), 1.05),
        ("art_crate_stack", (3.5, 0.0, 1.5), 1.1),
        ("art_signal_bell", (-8.0, 0.0, -1.0), 1.0),
        ("art_dock_ladder", (-15.0, -0.15, 2.0), 1.05),
    ],
    "moon": [
        ("art_moon_lantern", (-7.0, 0.0, 2.0), 1.1),
        ("art_moon_lantern", (4.5, 0.0, -2.5), 1.0),
        ("art_moon_lantern", (-12.0, 0.0, -1.5), 0.95),
        ("art_cove_rock", (-15.0, -0.3, 3.0), 1.4),
        ("art_cove_rock", (-16.5, -0.25, -2.0), 1.2),
        ("art_buoy", (-9.0, -0.2, 4.0), 0.85),
        ("art_bench", (2.0, 0.0, 1.5), 1.0),
        ("art_kelp_cluster", (-13.5, -0.35, 1.0), 1.15),
        ("art_canopy", (6.5, 0.0, 0.5), 1.05),
        ("art_crate_stack", (0.5, 0.0, -3.5), 1.0),
        ("art_tide_gauge", (-4.5, 0.0, -2.5), 0.95),
        ("art_dock_ladder", (-14.5, -0.2, -0.5), 1.0),
    ],
    "obsidian": [
        ("art_obsidian_pylon", (-8.0, 0.0, 2.5), 1.2),
        ("art_obsidian_pylon", (-12.0, 0.0, -2.0), 1.15),
        ("art_obsidian_pylon", (5.0, 0.0, -3.0), 1.1),
        ("art_basalt_stack", (-16.0, -0.2, 1.0), 1.5),
        ("art_basalt_stack", (-17.0, -0.2, -3.5), 1.35),
        ("art_storm_lamp", (8.0, 0.0, 1.0), 1.0),
        ("art_buoy", (-14.0, -0.25, 4.5), 0.9),
        ("art_crane_arm", (9.5, 0.0, -1.5), 1.1),
        ("art_crate_stack", (2.5, 0.0, 2.0), 1.05),
        ("art_signal_bell", (-5.5, 0.0, -2.5), 1.0),
        ("art_tide_gauge", (-10.0, 0.0, 1.5), 0.95),
        ("art_dock_ladder", (-15.5, -0.2, 3.0), 1.05),
    ],
    "northlight": [
        ("art_aurora_pole", (-6.0, 0.0, 2.0), 1.15),
        ("art_aurora_pole", (5.5, 0.0, -2.5), 1.1),
        ("art_aurora_pole", (-11.0, 0.0, -1.0), 1.2),
        ("art_ice_marker", (-15.0, -0.1, 3.0), 1.3),
        ("art_ice_marker", (-16.0, -0.1, -2.5), 1.2),
        ("art_ice_marker", (3.0, -0.05, 4.0), 1.0),
        ("art_buoy", (-9.5, -0.2, 4.5), 0.8),
        ("art_canopy", (7.0, 0.0, 1.0), 1.05),
        ("art_crate_stack", (1.5, 0.0, -3.0), 1.0),
        ("art_signal_bell", (-3.5, 0.0, -2.0), 0.95),
        ("art_tide_gauge", (8.5, 0.0, -1.5), 1.0),
        ("art_dock_ladder", (-14.0, -0.15, 1.0), 1.05),
    ],
    "marina": [
        ("art_bollard", (-5.0, 0.0, 2.0), 1.1),
        ("art_bollard", (-8.0, 0.0, -1.5), 1.05),
        ("art_bollard", (4.0, 0.0, 1.5), 1.0),
        ("art_flagpole", (8.0, 0.0, -2.0), 1.15),
        ("art_flagpole", (-12.0, 0.0, 1.0), 1.1),
        ("art_planter", (2.5, 0.0, 2.5), 1.2),
        ("art_planter", (6.0, 0.0, 2.0), 1.1),
        ("art_market_stall", (-2.0, 0.0, -4.0), 1.15),
        ("art_canopy", (9.5, 0.0, 1.5), 1.05),
        ("art_crane_arm", (-14.0, 0.0, -2.5), 1.1),
        ("art_crate_stack", (0.5, 0.0, 3.0), 1.0),
        ("art_signal_bell", (5.0, 0.0, -3.5), 0.95),
    ],
    "ember": [
        ("art_brazier", (-6.5, 0.0, 1.5), 1.15),
        ("art_brazier", (5.0, 0.0, -2.0), 1.1),
        ("art_brazier", (-11.0, 0.0, -1.5), 1.05),
        ("art_ash_crate", (3.0, 0.0, 2.0), 1.2),
        ("art_ash_crate", (7.0, 0.0, -3.0), 1.1),
        ("art_lantern", (-9.0, 0.0, 2.5), 0.95),
        ("art_buoy", (-14.5, -0.2, 3.5), 0.85),
        ("art_market_stall", (1.5, 0.0, -4.5), 1.1),
        ("art_crate_stack", (-3.0, 0.0, 2.8), 1.05),
        ("art_crane_arm", (9.0, 0.0, 0.5), 1.1),
        ("art_signal_bell", (-8.5, 0.0, -3.0), 1.0),
        ("art_dock_ladder", (-15.0, -0.15, 1.5), 1.05),
    ],
    "mist": [
        ("art_lantern", (-7.0, 0.0, 2.0), 1.05),
        ("art_lantern", (4.5, 0.0, -2.5), 1.0),
        ("art_kelp_cluster", (-14.0, -0.35, 1.5), 1.2),
        ("art_kelp_cluster", (-15.5, -0.35, -2.0), 1.1),
        ("art_buoy", (-12.0, -0.25, 4.0), 0.9),
        ("art_bench", (2.5, 0.0, 1.8), 1.05),
        ("art_canopy", (7.0, 0.0, 0.5), 1.1),
        ("art_crate_stack", (0.5, 0.0, -3.2), 1.0),
        ("art_tide_gauge", (-4.0, 0.0, -2.2), 0.95),
        ("art_dock_ladder", (-15.0, -0.2, -0.5), 1.0),
        ("art_bait_shed", (5.5, 0.0, -4.0), 1.05),
        ("art_signal_bell", (-8.0, 0.0, 1.0), 0.95),
    ],
    "prism": [
        ("art_aurora_pole", (-6.5, 0.0, 2.2), 1.2),
        ("art_aurora_pole", (5.0, 0.0, -2.0), 1.15),
        ("art_aurora_pole", (-11.5, 0.0, -1.2), 1.1),
        ("art_ice_marker", (-15.5, -0.1, 2.5), 1.25),
        ("art_ice_marker", (3.5, -0.05, 3.5), 1.05),
        ("art_planter", (2.0, 0.0, 2.2), 1.15),
        ("art_flagpole", (8.5, 0.0, -1.5), 1.1),
        ("art_canopy", (7.5, 0.0, 1.2), 1.05),
        ("art_crate_stack", (1.0, 0.0, -3.5), 1.0),
        ("art_signal_bell", (-3.0, 0.0, -2.5), 0.95),
        ("art_tide_gauge", (9.0, 0.0, -2.0), 1.0),
        ("art_dock_ladder", (-14.5, -0.15, 1.2), 1.05),
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
    "moon": {
        "water": "#1A3A58",
        "pier": "#8A92A0",
        "ground": "#3A4550",
        "zone_fishing": "#6A8AB0",
    },
    "obsidian": {
        "water": "#1A2838",
        "pier": "#3A3E48",
        "ground": "#2A2E36",
        "zone_fishing": "#4A5A70",
    },
    "northlight": {
        "water": "#2A6A88",
        "pier": "#C8D8E8",
        "ground": "#A8C0D0",
        "zone_fishing": "#7BE0D0",
    },
    "marina": {
        "water": "#3A9AC8",
        "pier": "#D8C8A8",
        "ground": "#B0C090",
        "zone_fishing": "#80C8E0",
    },
    "ember": {
        "water": "#3A5068",
        "pier": "#A07050",
        "ground": "#6A5040",
        "zone_fishing": "#E08050",
    },
    "mist": {
        "water": "#4A7088",
        "pier": "#9AA8B0",
        "ground": "#6A7880",
        "zone_fishing": "#8AB0C0",
    },
    "prism": {
        "water": "#3A78A8",
        "pier": "#D0C8E0",
        "ground": "#90A8C0",
        "zone_fishing": "#70E0D8",
    },
}


def theme_for_harbor(harbor_id: str) -> str | None:
    slug = harbor_id.split(".", 1)[-1]
    return AUTHORED_THEMES.get(slug)
