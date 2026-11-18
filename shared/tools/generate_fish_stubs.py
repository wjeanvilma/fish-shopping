#!/usr/bin/env python3
"""
Phase 13 — stylized species / product GLBs for every content-pack asset path.
Finish 2.0 Phase 20 + Finish 3.0 Phase 9 — authored multi-part FishArt_* meshes
for all species (shared/tools/fish_themes.py) while keeping the path contract.
Finish 4.0 Phase 10 — multi-part ProductArt_* products + cosmetic banner meshes
(shared/tools/product_themes.py).

Keeps the path contract (`models/fish_*.glb`, `models/product_*.glb`,
`models/cosmetic_banner_*.glb`). Clients load these as standard glTF 2.0
(Three.js GLTFLoader / Filament AssetLoader).

    python3 shared/tools/generate_fish_stubs.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fish_themes import (  # noqa: E402
    AUTHORED_SPECIES,
    FISH_ART_MARKER,
    THEME_COLORS,
    authored_body,
    part_dorsal,
    part_eye,
    part_pectoral,
    part_specialty,
    part_tail,
    placements_for_theme,
    theme_for_species,
)
from glb_geometry import (  # noqa: E402
    build_glb,
    build_multi_mesh_glb,
    fish_silhouette,
    product_silhouette,
)
from product_themes import (  # noqa: E402
    COSMETIC_BANNER_MARKER,
    PRODUCT_ART_MARKER,
    accent_for,
    cosmetic_banner_parts,
    product_kind_for,
    product_parts,
    rgb_to_hex,
)

GENERATOR = "fish-shopping generate_item_art.py"

# Display scale for world/catalog preview (metres). Harbor blockout slots stay separate.
FISH_SCALE = [0.30, 0.30, 0.30]
PRODUCT_SCALE = [0.24, 0.24, 0.24]
CRATE_SCALE = [0.34, 0.34, 0.34]

# Keyword → body color (sRGB hex). First match in id/name wins.
FISH_COLORS = [
    ("golden", "#E8AF4A"), ("gilt", "#D4A84B"), ("amber", "#E09A3E"),
    ("ruby", "#C23B4B"), ("sapphire", "#2F6FED"), ("bronze", "#CD7F32"),
    ("copper", "#B87333"), ("silver", "#C5D0D8"), ("pearl", "#E8E0D5"),
    ("opal", "#9AD0C5"), ("prism", "#9B7ED9"), ("ghost", "#D7E6F0"),
    ("aurora", "#6BC4C8"), ("crystal", "#A8E0F0"), ("frost", "#B8D4E8"),
    ("ice", "#9CC8E0"), ("arctic", "#7FA8C4"), ("polar", "#A0B8C8"),
    ("blue", "#3A7CA5"), ("ink", "#2A2438"), ("lava", "#C45C26"),
    ("ember", "#D4552A"), ("moon", "#8A9BB0"), ("sail", "#4A8FA8"),
    ("tide", "#3D7A6A"), ("reef", "#2F8F7A"), ("dawn", "#E8C07A"),
    ("crown", "#C9A227"), ("king", "#4F7A5A"), ("marina", "#2E6B8A"),
    ("saffron", "#D4A017"), ("harbor", "#6A8FA0"), ("pompano", "#D2B48C"),
    ("coral", "#E07070"), ("lagoon", "#2FA8A0"), ("tropic", "#F0A040"),
    ("gale", "#5A7A98"), ("squall", "#4A6080"), ("thunder", "#6A5ACD"),
    ("cinder", "#C06040"), ("ash", "#8A8A8A"), ("magma", "#E04020"),
    ("mangrove", "#C87840"), ("glass", "#C8E0E8"), ("shear", "#5A7088"),
    ("foam", "#A8C8D8"), ("slag", "#A06040"), ("kiln", "#C07050"),
    ("drift", "#B0D0E0"), ("rime", "#98B8C8"), ("silk", "#E0A050"),
    ("parade", "#4A90A8"), ("veil", "#8A9BB0"), ("dusk", "#6A5080"),
    ("basalt", "#5A5858"), ("amberjack", "#E0A050"), ("scad", "#4A90A8"),
    ("skate", "#8A9BB0"), ("cuttle", "#6A5080"), ("gurnard", "#5A5858"),
    ("goby", "#C8E0E8"), ("drum", "#5A7088"), ("loach", "#A06040"),
    ("icefish", "#B0D0E0"), ("bream", "#98B8C8"),
]
DEFAULT_FISH = "#7FA6B8"

PRODUCT_COLORS = {
    "basic_portion": "#F2B9A0",
    "fillet": "#E8C4A8",
    "premium_portion": "#F0A882",
    "smoked_fillet": "#C47A4A",
    "diced_fish": "#E0B090",
    "skewer": "#D4926A",
    "soup_stock": "#C8883A",
    "ice_packed_crate": "#8EB8C8",
    "fillet_crate": "#C4A882",
    "grilled_fillet": "#B86A32",
    "grilled_skewer": "#A85A28",
    "chilled_fillet": "#A8C8D4",
    "chilled_premium": "#90B8C8",
    "chilled_crate": "#7AA8B8",
    "fried_portion": "#E0A040",
    "fish_and_chips": "#E8B050",
    "crispy_skewer": "#D49838",
    "fried_carton": "#D4A060",
    "chips_carton": "#E0B060",
    "grill_carton": "#C88848",
    "skewer_carton": "#C89858",
    "steamed_fillet": "#C8D8C0",
    "steamed_portion": "#B8D0B0",
    "harbor_broth": "#C89848",
    "steam_carton": "#A8C098",
    "cured_fillet": "#B06038",
    "dried_strip": "#A07040",
    "kiln_carton": "#986040",
    "pressed_fillet": "#C8A070",
    "fish_cake": "#D4B080",
    "press_carton": "#B09068",
    "pickled_fillet": "#70A878",
    "relish_jar": "#88B060",
    "pickle_carton": "#609868",
}
DEFAULT_PRODUCT = "#F2B9A0"

def fish_kind(species_id: str, name: str) -> str:
    blob = f"{species_id} {name}".lower()
    if "squid" in blob:
        return "squid"
    if "eel" in blob:
        return "eel"
    if "ray" in blob or "flounder" in blob or "sole" in blob:
        return "flat"
    if "needle" in blob or "anchovy" in blob or "smelt" in blob:
        return "long"
    return "default"


def fish_color(species_id: str, name: str) -> str:
    blob = f"{species_id} {name}".lower()
    for key, color in FISH_COLORS:
        if key in blob:
            return color
    return DEFAULT_FISH


def product_kind(product_id: str) -> str:
    return product_kind_for(product_id)


def product_color(product_id: str) -> str:
    short = product_id.split(".", 1)[-1]
    return PRODUCT_COLORS.get(short, DEFAULT_PRODUCT)


def write_stub_fish(out_dir: Path, item_id: str, asset: str, color: str, kind: str) -> Path:
    rel = asset[len("models/"):] if asset.startswith("models/") else asset
    out = out_dir / rel
    pos, nrm, idx, bounds = fish_silhouette(kind)
    out.write_bytes(build_glb(
        name=item_id,
        generator=GENERATOR,
        color=color,
        pos=pos,
        nrm=nrm,
        idx=idx,
        bounds=bounds,
        scale=FISH_SCALE,
        extras={"stylized": True, "silhouette": kind, "phase": 13, "itemArt": "stylized-phase-13"},
    ))
    return out


def write_authored_fish(
    out_dir: Path,
    item_id: str,
    asset: str,
    kind: str,
    theme: str,
) -> Path:
    rel = asset[len("models/"):] if asset.startswith("models/") else asset
    out = out_dir / rel
    palette = THEME_COLORS[theme]
    parts = []
    for mesh_key, translation, part_scale in placements_for_theme(theme):
        if mesh_key == "body":
            pos, nrm, idx, bounds = authored_body(kind)
            color = palette["body"]
        elif mesh_key == "dorsal":
            pos, nrm, idx, bounds = part_dorsal(theme)
            color = palette["fin"]
        elif mesh_key == "tail":
            pos, nrm, idx, bounds = part_tail(theme)
            color = palette["fin"]
        elif mesh_key == "pectoral":
            pos, nrm, idx, bounds = part_pectoral()
            color = palette["fin"]
        elif mesh_key == "eye":
            pos, nrm, idx, bounds = part_eye()
            color = palette["accent"]
        else:
            pos, nrm, idx, bounds = part_specialty(theme)
            color = palette["accent"]
        parts.append({
            "name": f"FishArt_{mesh_key}",
            "color": color,
            "pos": pos,
            "nrm": nrm,
            "idx": idx,
            "bounds": bounds,
            "translation": translation,
            "part_scale": part_scale,
        })
    out.write_bytes(build_multi_mesh_glb(
        name=item_id,
        generator=GENERATOR,
        parts=parts,
        scale=FISH_SCALE,
        extras={
            "stylized": True,
            "silhouette": kind,
            "phase": 20,
            "fishArt": FISH_ART_MARKER,
            "itemArt": FISH_ART_MARKER,
            "fishTheme": theme,
        },
    ))
    return out


def write_product(out_dir: Path, item_id: str, asset: str, color: str, kind: str) -> Path:
    """Finish 4.0 Phase 10 — multi-part ProductArt_* product meshes."""
    rel = asset[len("models/"):] if asset.startswith("models/") else asset
    out = out_dir / rel
    accent = accent_for(color)
    parts = product_parts(kind, color, accent)
    scale = CRATE_SCALE if kind == "crate" else PRODUCT_SCALE
    out.write_bytes(build_multi_mesh_glb(
        name=item_id,
        generator=GENERATOR,
        parts=parts,
        scale=scale,
        extras={
            "stylized": True,
            "silhouette": kind,
            "phase": 10,
            "itemArt": PRODUCT_ART_MARKER,
            "productArt": PRODUCT_ART_MARKER,
            "productKind": kind,
        },
    ))
    return out


def write_cosmetic_banner(
    out_dir: Path,
    cosmetic_id: str,
    swatch_rgb: list[int],
) -> Path:
    short = cosmetic_id.replace("banner.", "").replace("iap_", "")
    out = out_dir / f"cosmetic_banner_{short}.glb"
    cloth = rgb_to_hex(swatch_rgb)
    crest = accent_for(cloth)
    parts = cosmetic_banner_parts(cloth, crest)
    out.write_bytes(build_multi_mesh_glb(
        name=cosmetic_id,
        generator=GENERATOR,
        parts=parts,
        scale=[1.0, 1.0, 1.0],
        extras={
            "stylized": True,
            "phase": 10,
            "itemArt": PRODUCT_ART_MARKER,
            "cosmeticArt": COSMETIC_BANNER_MARKER,
            "cosmeticId": cosmetic_id,
        },
    ))
    return out


def main() -> int:
    content = json.loads((ROOT / "content" / "content-pack.json").read_text())
    presentation = json.loads((ROOT / "content" / "cosmetic-presentation.json").read_text())
    out_dir = ROOT / "assets" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    fish_n = authored_n = product_n = banner_n = 0
    for sp in content["species"]:
        asset = sp.get("asset")
        if not asset:
            continue
        kind = fish_kind(sp["id"], sp.get("name", ""))
        theme = theme_for_species(sp["id"])
        if theme:
            write_authored_fish(out_dir, sp["id"], asset, kind, theme)
            authored_n += 1
        else:
            write_stub_fish(
                out_dir, sp["id"], asset,
                fish_color(sp["id"], sp.get("name", "")),
                kind,
            )
        fish_n += 1
    for prod in content["products"]:
        asset = prod.get("asset")
        if not asset:
            continue
        write_product(
            out_dir, prod["id"], asset,
            product_color(prod["id"]),
            product_kind(prod["id"]),
        )
        product_n += 1
    for item in presentation.get("items", []):
        write_cosmetic_banner(out_dir, item["cosmeticId"], item["swatchRgb"])
        banner_n += 1
    print(
        f"{fish_n} fish ({authored_n} authored Phase 20 / "
        f"{fish_n - authored_n} stub Phase 13), {product_n} products "
        f"(ProductArt Phase 10), {banner_n} cosmetic banners → {GENERATOR}"
    )
    assert authored_n >= len(AUTHORED_SPECIES), "authored species missing from content-pack"
    assert product_n >= 34, "expected ≥34 authored products"
    assert banner_n >= 12, "expected ≥12 cosmetic banners"
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
