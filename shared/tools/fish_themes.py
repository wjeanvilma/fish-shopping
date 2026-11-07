"""
Finish 2.0 Phase 20 — authored low-poly fish themes for top species.

Authored species get multi-part FishArt_* meshes + distinct palettes while
keeping the same models/fish_*.glb path contract.
"""
from __future__ import annotations

from glb_geometry import add_box, fish_silhouette, mesh_bounds, normalize_mesh

FISH_ART_MARKER = "authored-phase-20"
FISH_ART_MIN = 10

# Sunrise Pier gallery commons — trophy board "top species".
AUTHORED_SPECIES = {
    "species.dawn_anchovy": "pier_slender",
    "species.silver_sprat": "pier_silver",
    "species.harbor_herring": "pier_herring",
    "species.sail_needlefish": "pier_needle",
    "species.blue_mackerel": "pier_mackerel",
    "species.copper_mullet": "pier_copper",
    "species.tide_bass": "pier_bass",
    "species.amber_snapper": "pier_snapper",
    "species.king_grouper": "pier_grouper",
    "species.reef_perch": "pier_reef",
}

THEME_COLORS = {
    "pier_slender": {"body": "#E8C07A", "fin": "#D4A84B", "accent": "#F5E6C8"},
    "pier_silver": {"body": "#C5D0D8", "fin": "#9AA8B4", "accent": "#E8F0F4"},
    "pier_herring": {"body": "#6A8FA0", "fin": "#4A7080", "accent": "#B8D0D8"},
    "pier_needle": {"body": "#4A8FA8", "fin": "#2F6A80", "accent": "#A8D0E0"},
    "pier_mackerel": {"body": "#3A7CA5", "fin": "#2A5A78", "accent": "#7AB0D0"},
    "pier_copper": {"body": "#B87333", "fin": "#8A5520", "accent": "#E0A060"},
    "pier_bass": {"body": "#3D7A6A", "fin": "#2A5A4A", "accent": "#70B0A0"},
    "pier_snapper": {"body": "#E09A3E", "fin": "#B07020", "accent": "#F0C070"},
    "pier_grouper": {"body": "#4F7A5A", "fin": "#355540", "accent": "#90B090"},
    "pier_reef": {"body": "#2F8F7A", "fin": "#1A6A58", "accent": "#60C8B0"},
}


def _finish_part(pos, nrm, idx):
    (x0, y0, z0), (x1, y1, z1) = mesh_bounds(pos)
    cx, cy, cz = (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5
    out = [((x - cx), (y - cy), (z - cz)) for x, y, z in pos]
    return out, nrm, idx, mesh_bounds(out)


def part_dorsal(theme: str):
    pos, nrm, idx = [], [], []
    if "needle" in theme or "slender" in theme:
        add_box(pos, nrm, idx, (0.05, 0.22, 0.0), (0.35, 0.28, 0.04))
        add_box(pos, nrm, idx, (-0.05, 0.18, 0.0), (0.18, 0.16, 0.03))
    elif "grouper" in theme or "bass" in theme:
        add_box(pos, nrm, idx, (0.0, 0.28, 0.0), (0.40, 0.32, 0.06))
        add_box(pos, nrm, idx, (0.12, 0.38, 0.0), (0.12, 0.18, 0.04))
    else:
        add_box(pos, nrm, idx, (0.0, 0.24, 0.0), (0.38, 0.26, 0.05))
        add_box(pos, nrm, idx, (0.10, 0.34, 0.0), (0.10, 0.14, 0.03))
    return _finish_part(pos, nrm, idx)


def part_tail(theme: str):
    pos, nrm, idx = [], [], []
    if "needle" in theme:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.18, 0.12, 0.04))
        add_box(pos, nrm, idx, (-0.12, 0.10, 0.0), (0.14, 0.18, 0.03))
        add_box(pos, nrm, idx, (-0.12, -0.10, 0.0), (0.14, 0.18, 0.03))
    elif "grouper" in theme:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.22, 0.28, 0.06))
        add_box(pos, nrm, idx, (-0.14, 0.16, 0.0), (0.16, 0.22, 0.04))
        add_box(pos, nrm, idx, (-0.14, -0.16, 0.0), (0.16, 0.22, 0.04))
    else:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.20, 0.16, 0.05))
        add_box(pos, nrm, idx, (-0.12, 0.12, 0.0), (0.14, 0.20, 0.03))
        add_box(pos, nrm, idx, (-0.12, -0.12, 0.0), (0.14, 0.20, 0.03))
    return _finish_part(pos, nrm, idx)


def part_pectoral():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.22, 0.08, 0.28))
    add_box(pos, nrm, idx, (0.08, 0.0, 0.10), (0.10, 0.05, 0.16))
    return _finish_part(pos, nrm, idx)


def part_eye():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.08, 0.08, 0.08))
    add_box(pos, nrm, idx, (0.02, 0.01, 0.03), (0.04, 0.04, 0.04))
    return _finish_part(pos, nrm, idx)


def part_specialty(theme: str):
    """Theme-unique bump so pairwise digests stay distinct even with shared silhouette base."""
    pos, nrm, idx = [], [], []
    if "silver" in theme:
        for x in (-0.12, 0.0, 0.12):
            add_box(pos, nrm, idx, (x, 0.06, 0.0), (0.06, 0.04, 0.18))
    elif "mackerel" in theme:
        for z in (-0.08, 0.0, 0.08):
            add_box(pos, nrm, idx, (0.05, 0.08, z), (0.30, 0.03, 0.04))
    elif "copper" in theme:
        add_box(pos, nrm, idx, (0.10, 0.0, 0.0), (0.16, 0.20, 0.20))
        add_box(pos, nrm, idx, (0.18, 0.05, 0.0), (0.08, 0.10, 0.10))
    elif "snapper" in theme:
        add_box(pos, nrm, idx, (0.18, 0.02, 0.0), (0.14, 0.14, 0.14))
        add_box(pos, nrm, idx, (0.24, -0.04, 0.0), (0.08, 0.08, 0.10))
    elif "reef" in theme:
        add_box(pos, nrm, idx, (0.0, 0.12, 0.0), (0.20, 0.10, 0.22))
        add_box(pos, nrm, idx, (-0.05, 0.18, 0.08), (0.08, 0.12, 0.08))
    elif "herring" in theme:
        add_box(pos, nrm, idx, (0.0, -0.10, 0.0), (0.35, 0.06, 0.12))
    elif "bass" in theme:
        add_box(pos, nrm, idx, (0.05, 0.0, 0.12), (0.18, 0.16, 0.08))
        add_box(pos, nrm, idx, (0.05, 0.0, -0.12), (0.18, 0.16, 0.08))
    elif "grouper" in theme:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.45, 0.35, 0.30))
        add_box(pos, nrm, idx, (0.15, 0.10, 0.0), (0.12, 0.12, 0.20))
    elif "needle" in theme:
        add_box(pos, nrm, idx, (0.28, 0.0, 0.0), (0.35, 0.06, 0.06))
        add_box(pos, nrm, idx, (0.42, 0.0, 0.0), (0.12, 0.04, 0.04))
    else:  # slender / dawn
        add_box(pos, nrm, idx, (0.20, 0.04, 0.0), (0.16, 0.08, 0.08))
        add_box(pos, nrm, idx, (-0.10, -0.06, 0.0), (0.20, 0.05, 0.10))
    return _finish_part(pos, nrm, idx)


def authored_body(silhouette_kind: str):
    """Base body from silhouette, lightly densified with a belly strip."""
    pos, nrm, idx, _ = fish_silhouette(silhouette_kind)
    # densify copy into mutable lists
    pos = list(pos)
    nrm = list(nrm)
    idx = list(idx)
    add_box(pos, nrm, idx, (0.0, -0.08, 0.0), (0.55, 0.10, 0.22))
    pos, bounds = normalize_mesh(pos, target_length=1.0)
    return pos, nrm, idx, bounds


def theme_for_species(species_id: str) -> str | None:
    return AUTHORED_SPECIES.get(species_id)


def placements_for_theme(theme: str) -> list[tuple[str, list[float], list[float]]]:
    """
    Return (mesh_key, translation, scale) for FishArt parts.
    mesh_key maps to builder in generate_fish_stubs.
    """
    # Body at origin; appendages offset along local fish axes (length +X).
    if "needle" in theme:
        return [
            ("body", [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
            ("dorsal", [0.05, 0.12, 0.0], [0.9, 0.9, 0.9]),
            ("tail", [-0.42, 0.0, 0.0], [0.85, 0.85, 0.85]),
            ("pectoral", [0.05, -0.02, 0.12], [0.7, 0.7, 0.7]),
            ("eye", [0.32, 0.04, 0.06], [1.0, 1.0, 1.0]),
            ("specialty", [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
        ]
    if "grouper" in theme:
        return [
            ("body", [0.0, 0.0, 0.0], [1.05, 1.1, 1.1]),
            ("dorsal", [0.0, 0.18, 0.0], [1.0, 1.0, 1.0]),
            ("tail", [-0.38, 0.0, 0.0], [1.0, 1.0, 1.0]),
            ("pectoral", [0.08, -0.04, 0.16], [0.9, 0.9, 0.9]),
            ("eye", [0.28, 0.06, 0.10], [1.1, 1.1, 1.1]),
            ("specialty", [0.0, 0.0, 0.0], [0.55, 0.55, 0.55]),
        ]
    return [
        ("body", [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
        ("dorsal", [0.02, 0.14, 0.0], [0.95, 0.95, 0.95]),
        ("tail", [-0.40, 0.0, 0.0], [0.9, 0.9, 0.9]),
        ("pectoral", [0.06, -0.02, 0.14], [0.75, 0.75, 0.75]),
        ("eye", [0.30, 0.05, 0.08], [1.0, 1.0, 1.0]),
        ("specialty", [0.0, 0.02, 0.0], [0.9, 0.9, 0.9]),
    ]
