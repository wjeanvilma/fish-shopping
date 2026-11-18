"""
Finish 4.0 Phase 10 — multi-part product art + cosmetic banner meshes.

Products get ProductArt_* nodes (base / body / garnish / label) beyond Phase 13
single-silhouette stubs. Cosmetics get authored banner GLBs for pier presentation.
"""
from __future__ import annotations

from glb_geometry import add_box, mesh_bounds, product_silhouette

PRODUCT_ART_MARKER = "authored-finish-4.0-phase-10"
PRODUCT_ART_MIN = 34
PRODUCT_ART_MIN_NODES = 4
COSMETIC_BANNER_MARKER = "cosmetic-banner-phase-10"
COSMETIC_BANNER_MIN = 12


def _finish(pos, nrm, idx):
    (x0, y0, z0), (x1, y1, z1) = mesh_bounds(pos)
    cx, cy, cz = (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5
    out = [((x - cx), (y - cy), (z - cz)) for x, y, z in pos]
    return out, nrm, idx, mesh_bounds(out)


def part_platter():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, -0.08, 0.0), (0.70, 0.06, 0.50))
    add_box(pos, nrm, idx, (0.0, -0.04, 0.0), (0.62, 0.04, 0.42))
    return _finish(pos, nrm, idx)


def part_label():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.28, 0.04, 0.16))
    add_box(pos, nrm, idx, (0.0, 0.04, 0.0), (0.22, 0.02, 0.10))
    return _finish(pos, nrm, idx)


def part_garnish():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (-0.08, 0.0, 0.0), (0.10, 0.08, 0.08))
    add_box(pos, nrm, idx, (0.08, 0.02, 0.04), (0.08, 0.06, 0.08))
    add_box(pos, nrm, idx, (0.0, 0.06, -0.06), (0.12, 0.04, 0.06))
    return _finish(pos, nrm, idx)


def part_steam_wisp():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (-0.04, 0.0, 0.0), (0.06, 0.18, 0.06))
    add_box(pos, nrm, idx, (0.05, 0.08, 0.02), (0.05, 0.16, 0.05))
    add_box(pos, nrm, idx, (0.0, 0.16, -0.03), (0.05, 0.12, 0.05))
    return _finish(pos, nrm, idx)


def part_banner_pole():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.08, 2.40, 0.08))
    add_box(pos, nrm, idx, (0.0, -1.15, 0.0), (0.28, 0.12, 0.28))
    return _finish(pos, nrm, idx)


def part_banner_cloth():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (1.20, 1.40, 0.04))
    add_box(pos, nrm, idx, (0.0, 0.65, 0.0), (1.28, 0.10, 0.06))
    add_box(pos, nrm, idx, (-0.45, -0.10, 0.03), (0.18, 0.70, 0.03))
    add_box(pos, nrm, idx, (0.45, -0.10, 0.03), (0.18, 0.70, 0.03))
    return _finish(pos, nrm, idx)


def part_banner_crest():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.35, 0.35, 0.06))
    add_box(pos, nrm, idx, (0.0, 0.22, 0.0), (0.18, 0.12, 0.05))
    add_box(pos, nrm, idx, (0.0, -0.18, 0.0), (0.22, 0.10, 0.05))
    return _finish(pos, nrm, idx)


def product_kind_for(product_id: str) -> str:
    pid = product_id.lower()
    if "crate" in pid:
        return "crate"
    if "carton" in pid:
        return "carton"
    if "skewer" in pid:
        return "skewer"
    if "soup" in pid or "broth" in pid or "relish" in pid or "jar" in pid or "stew" in pid:
        return "soup"
    if "diced" in pid or "dried_strip" in pid or "fish_cake" in pid:
        return "diced"
    if "fish_and_chips" in pid or "chips" in pid:
        return "chips"
    if (
        "fried" in pid
        or "crispy" in pid
        or "grilled" in pid
        or "cured" in pid
        or "steamed" in pid
        or "braised" in pid
        or "glazed" in pid
        or "glaze" in pid
    ):
        return "fried"
    if "fillet" in pid:
        return "fillet"
    return "portion"


def product_parts(kind: str, body_color: str, accent: str) -> list[dict]:
    """Return multi-part ProductArt assembly for a product kind."""
    body_pos, body_nrm, body_idx, body_bounds = product_silhouette(kind)
    # Enrich body with a second layer so verts clearly exceed Phase 13 cubes.
    enrich_pos, enrich_nrm, enrich_idx = [], [], []
    add_box(enrich_pos, enrich_nrm, enrich_idx, (0.0, 0.12, 0.0), (0.18, 0.06, 0.14))
    add_box(enrich_pos, enrich_nrm, enrich_idx, (0.14, 0.04, 0.10), (0.08, 0.08, 0.08))
    e_pos, e_nrm, e_idx, e_bounds = _finish(enrich_pos, enrich_nrm, enrich_idx)

    platter_pos, platter_nrm, platter_idx, platter_bounds = part_platter()
    label_pos, label_nrm, label_idx, label_bounds = part_label()
    garnish_pos, garnish_nrm, garnish_idx, garnish_bounds = part_garnish()

    parts = [
        {
            "name": "ProductArt_platter",
            "color": "#D8C4A0",
            "pos": platter_pos,
            "nrm": platter_nrm,
            "idx": platter_idx,
            "bounds": platter_bounds,
            "translation": (0.0, -0.12, 0.0),
            "part_scale": (1.0, 1.0, 1.0),
        },
        {
            "name": "ProductArt_body",
            "color": body_color,
            "pos": body_pos,
            "nrm": body_nrm,
            "idx": body_idx,
            "bounds": body_bounds,
            "translation": (0.0, 0.02, 0.0),
            "part_scale": (1.0, 1.0, 1.0),
        },
        {
            "name": "ProductArt_garnish",
            "color": accent,
            "pos": garnish_pos,
            "nrm": garnish_nrm,
            "idx": garnish_idx,
            "bounds": garnish_bounds,
            "translation": (0.18, 0.14, 0.08),
            "part_scale": (0.9, 0.9, 0.9),
        },
        {
            "name": "ProductArt_label",
            "color": "#F4E8D0",
            "pos": label_pos,
            "nrm": label_nrm,
            "idx": label_idx,
            "bounds": label_bounds,
            "translation": (-0.16, 0.16, 0.18),
            "part_scale": (1.0, 1.0, 1.0),
        },
    ]
    if kind in ("soup", "fried", "steamed", "chips"):
        w_pos, w_nrm, w_idx, w_bounds = part_steam_wisp()
        parts.append(
            {
                "name": "ProductArt_steam",
                "color": "#E8F0F4",
                "pos": w_pos,
                "nrm": w_nrm,
                "idx": w_idx,
                "bounds": w_bounds,
                "translation": (0.0, 0.28, 0.0),
                "part_scale": (1.0, 1.0, 1.0),
            }
        )
    else:
        parts.append(
            {
                "name": "ProductArt_accent",
                "color": accent,
                "pos": e_pos,
                "nrm": e_nrm,
                "idx": e_idx,
                "bounds": e_bounds,
                "translation": (0.0, 0.18, -0.10),
                "part_scale": (1.0, 1.0, 1.0),
            }
        )
    return parts


# Counter presentation: how Stock_* slots prefer product families (presentation-only).
COUNTER_PRESENTATION = {
    "layoutId": "counter.tray.v1",
    "slotsVisibleMax": 8,
    "preferKinds": ["carton", "crate", "fillet", "portion", "skewer"],
    "stackYStepM": 0.08,
}


def cosmetic_banner_parts(swatch_hex: str, crest_hex: str) -> list[dict]:
    pole_pos, pole_nrm, pole_idx, pole_bounds = part_banner_pole()
    cloth_pos, cloth_nrm, cloth_idx, cloth_bounds = part_banner_cloth()
    crest_pos, crest_nrm, crest_idx, crest_bounds = part_banner_crest()
    return [
        {
            "name": "CosmeticArt_pole",
            "color": "#8B7355",
            "pos": pole_pos,
            "nrm": pole_nrm,
            "idx": pole_idx,
            "bounds": pole_bounds,
            "translation": (0.0, 0.0, 0.0),
            "part_scale": (1.0, 1.0, 1.0),
        },
        {
            "name": "CosmeticArt_cloth",
            "color": swatch_hex,
            "pos": cloth_pos,
            "nrm": cloth_nrm,
            "idx": cloth_idx,
            "bounds": cloth_bounds,
            "translation": (0.65, 0.35, 0.0),
            "part_scale": (1.0, 1.0, 1.0),
        },
        {
            "name": "CosmeticArt_crest",
            "color": crest_hex,
            "pos": crest_pos,
            "nrm": crest_nrm,
            "idx": crest_idx,
            "bounds": crest_bounds,
            "translation": (0.65, 0.45, 0.05),
            "part_scale": (1.0, 1.0, 1.0),
        },
        {
            "name": "CosmeticArt_finial",
            "color": "#C4A35A",
            "pos": crest_pos,
            "nrm": crest_nrm,
            "idx": crest_idx,
            "bounds": crest_bounds,
            "translation": (0.0, 1.25, 0.0),
            "part_scale": (0.55, 0.55, 0.55),
        },
    ]


def rgb_to_hex(rgb: list[int]) -> str:
    return f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"


def accent_for(body_hex: str) -> str:
    """Derive a brighter garnish accent from body color."""
    h = body_hex.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    r = min(255, int(r * 1.15 + 20))
    g = min(255, int(g * 1.10 + 10))
    b = min(255, int(b * 0.95 + 5))
    return f"#{r:02X}{g:02X}{b:02X}"
