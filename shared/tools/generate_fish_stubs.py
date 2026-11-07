#!/usr/bin/env python3
"""
Phase 13 — stylized species / product GLBs for every content-pack asset path.

Keeps the path contract (`models/fish_*.glb`, `models/product_*.glb`). Meshes are
procedural silhouettes (not grey-box cubes) with per-item colors. Clients load
these as standard glTF 2.0 (Three.js GLTFLoader / Filament AssetLoader).

    python3 shared/tools/generate_fish_stubs.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from glb_geometry import (  # noqa: E402
    build_glb,
    fish_silhouette,
    product_silhouette,
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
}
DEFAULT_PRODUCT = "#F2B9A0"


def fish_kind(species_id: str, name: str) -> str:
    blob = f"{species_id} {name}".lower()
    if "squid" in blob:
        return "squid"
    if "eel" in blob:
        return "eel"
    if "flounder" in blob or "sole" in blob:
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
    pid = product_id.lower()
    if "crate" in pid:
        return "crate"
    if "carton" in pid:
        return "carton"
    if "skewer" in pid:
        return "skewer"
    if "soup" in pid:
        return "soup"
    if "diced" in pid:
        return "diced"
    if "fish_and_chips" in pid or "chips" in pid:
        return "chips"
    if "fried" in pid or "crispy" in pid or "grilled" in pid:
        return "fried"
    if "fillet" in pid:
        return "fillet"
    return "portion"


def product_color(product_id: str) -> str:
    short = product_id.split(".", 1)[-1]
    return PRODUCT_COLORS.get(short, DEFAULT_PRODUCT)


def write_item(out_dir: Path, item_id: str, asset: str, color: str, kind: str, family: str) -> Path:
    rel = asset[len("models/"):] if asset.startswith("models/") else asset
    out = out_dir / rel
    if family == "fish":
        pos, nrm, idx, bounds = fish_silhouette(kind)
        scale = FISH_SCALE
    else:
        pos, nrm, idx, bounds = product_silhouette(kind)
        scale = CRATE_SCALE if kind == "crate" else PRODUCT_SCALE
    out.write_bytes(build_glb(
        name=item_id,
        generator=GENERATOR,
        color=color,
        pos=pos,
        nrm=nrm,
        idx=idx,
        bounds=bounds,
        scale=scale,
        extras={"stylized": True, "silhouette": kind, "phase": 13},
    ))
    return out


def main() -> int:
    content = json.loads((ROOT / "content" / "content-pack.json").read_text())
    out_dir = ROOT / "assets" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    fish_n = product_n = 0
    for sp in content["species"]:
        asset = sp.get("asset")
        if not asset:
            continue
        write_item(
            out_dir, sp["id"], asset,
            fish_color(sp["id"], sp.get("name", "")),
            fish_kind(sp["id"], sp.get("name", "")),
            "fish",
        )
        fish_n += 1
    for prod in content["products"]:
        asset = prod.get("asset")
        if not asset:
            continue
        write_item(
            out_dir, prod["id"], asset,
            product_color(prod["id"]),
            product_kind(prod["id"]),
            "product",
        )
        product_n += 1
    print(f"{fish_n} stylized fish, {product_n} stylized products → {GENERATOR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
