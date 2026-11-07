#!/usr/bin/env python3
"""
Generates a harbor GLB from shared/content/content-pack.json so the visible layout
matches the simulation's walkable areas, footprints and zones.

Phase 14 replaces grey-box pier / machine / counter boxes with authored modules
(shared/tools/env_modules.py → models/modules/*.glb). Phase 15 replaces grey-box
characters with stylized player / customer / worker meshes (models/characters/*.glb)
and adds a Worker_* pool. Finish 2.0 Phase 19 adds per-harbor HarborArt_* props +
palette themes (shared/tools/harbor_themes.py) for ≥3 authored harbors.
Presenter socket names:

    Player / PlayerBody / PlayerNose / PlayerRod
    Bag_<i>_fish / Bag_<i>_portion
    In_<station>_<i> / Out_<station>_<i> / Stock_<counter>_<i>
    Customer_0..N / CustomerBody_N
    Worker_0..N / WorkerBody_N
    Fly_<i>_fish / Fly_<i>_portion
    VfxBurst_0..N
    Zone_* / Footprint_* / Pier / Ground_* / Water

    python3 shared/tools/generate_blockout.py
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from character_modules import CHARACTER_BUILDERS, CHARACTER_COLORS  # noqa: E402
from env_modules import (  # noqa: E402
    MODULE_BUILDERS,
    MODULE_COLORS,
    MODULE_HEIGHTS,
)
from glb_geometry import (  # noqa: E402
    fish_silhouette,
    pack_geometry,
    product_silhouette,
    srgb_to_linear,
    unit_cube,
)
from harbor_themes import (  # noqa: E402
    HARBOR_ART_BUILDERS,
    HARBOR_ART_COLORS,
    HARBOR_ART_MARKER,
    THEME_PALETTE,
    THEME_PLACEMENTS,
    theme_for_harbor,
)

PALETTE = {
    **MODULE_COLORS,
    **CHARACTER_COLORS,
    **HARBOR_ART_COLORS,
    "water": "#2E7FA8",
    "player_nose": "#FBF7EF",
    "vfx_burst": "#F6E27A",
    "zone_fishing": "#7FC6E0",
    "zone_machine_input": "#6FD0C6",
    "zone_machine_output": "#F3D08C",
    "zone_counter": "#F3D08C",
    "zone_kiosk": "#C4A35A",
    "zone_plot": "#7A9E7E",
    "fish": "#7FA6B8",
    "portion": "#F2B9A0",
}

WORKER_POOL = 12
VFX_BURST_POOL = 8


FISH_SIZE = [0.30, 0.30, 0.30]
PORTION_SIZE = [0.22, 0.22, 0.22]
VFX_BURST_SIZE = [0.28, 0.28, 0.28]

def _machine_key(obstacle_id: str) -> str:
    oid = obstacle_id.lower()
    for key in ("smoker", "grill", "chiller", "fryer", "packer", "steamer", "kiln", "cutter", "counter"):
        if key in oid:
            return key
    return "counter"


def build(content, harbor):
    theme = theme_for_harbor(harbor["id"])
    palette = {**PALETTE, **(THEME_PALETTE.get(theme, {}) if theme else {})}

    cube_pos, cube_nrm, cube_idx = unit_cube()
    fish_pos, fish_nrm, fish_idx, fish_bounds = fish_silhouette("default")
    portion_pos, portion_nrm, portion_idx, portion_bounds = product_silhouette("portion")

    geom_index = {}  # mesh_key -> (pos_acc, nrm_acc, idx_acc)
    # Accessors: cube=0..2, fish=3..5, portion=6..8, then env modules, then characters, then art
    next_acc = 9
    parts = [
        (cube_pos, cube_nrm, cube_idx, ([-.5, -.5, -.5], [.5, .5, .5])),
        (fish_pos, fish_nrm, fish_idx, fish_bounds),
        (portion_pos, portion_nrm, portion_idx, portion_bounds),
    ]
    for name in (
        "pier", "ground", "zone", "counter", "cutter", "smoker", "grill",
        "chiller", "fryer", "packer", "steamer", "kiln",
    ):
        pos, nrm, idx, bounds = MODULE_BUILDERS[name]()
        geom_index[name] = (next_acc, next_acc + 1, next_acc + 2)
        next_acc += 3
        parts.append((pos, nrm, idx, bounds))
    for name in CHARACTER_BUILDERS:
        pos, nrm, idx, bounds = CHARACTER_BUILDERS[name]()
        geom_index[name] = (next_acc, next_acc + 1, next_acc + 2)
        next_acc += 3
        parts.append((pos, nrm, idx, bounds))
    if theme:
        needed = {mesh_key for mesh_key, _, _ in THEME_PLACEMENTS[theme]}
        for name in sorted(needed):
            pos, nrm, idx, bounds = HARBOR_ART_BUILDERS[name]()
            geom_index[name] = (next_acc, next_acc + 1, next_acc + 2)
            next_acc += 3
            parts.append((pos, nrm, idx, bounds))

    blob, buffer_views, accessors = pack_geometry(parts)
    geom = {
        "cube": (0, 1, 2),
        "fish": (3, 4, 5),
        "portion": (6, 7, 8),
        **geom_index,
    }
    # Zone color variants share the zone pad silhouette.
    for zk in ("zone_fishing", "zone_machine_input", "zone_machine_output", "zone_counter", "zone_kiosk", "zone_plot"):
        geom[zk] = geom["zone"]
    geom["customer"] = geom["customer_0"]

    extras = {
        "itemArt": "stylized-phase-13",
        "envArt": "modular-phase-14",
        "characterArt": "clips-phase-15",
        "machineVfx": "phase-16",
    }
    if theme:
        extras["envArt"] = "modular-phase-14+harbor-art-19"
        extras["harborArt"] = HARBOR_ART_MARKER
        extras["harborTheme"] = theme

    gltf = {
        "asset": {"version": "2.0", "generator": "fish-shopping generate_blockout.py"},
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "materials": [], "meshes": [], "nodes": [], "scenes": [{"name": harbor["id"], "nodes": []}], "scene": 0,
        "extras": extras,
    }
    mesh_for = {}

    def mesh_shape(color_key: str) -> str:
        if color_key in ("fish", "portion"):
            return color_key
        if color_key.startswith("zone_"):
            return "zone"
        if color_key in geom_index:
            return color_key
        if color_key == "customer":
            return "customer_0"
        return "cube"

    def mesh(color_key: str):
        if color_key not in mesh_for:
            shape = mesh_shape(color_key)
            pos_i, nrm_i, idx_i = geom[shape]
            stylized = shape != "cube"
            gltf["materials"].append({
                "name": color_key,
                "pbrMetallicRoughness": {
                    "baseColorFactor": srgb_to_linear(palette.get(color_key, "#888888")),
                    "metallicFactor": 0.05 if stylized else 0.0,
                    "roughnessFactor": 0.55 if stylized else 0.85,
                },
            })
            gltf["meshes"].append({"name": color_key, "primitives": [{
                "attributes": {"POSITION": pos_i, "NORMAL": nrm_i},
                "indices": idx_i,
                "material": len(gltf["materials"]) - 1,
            }]})
            mesh_for[color_key] = len(gltf["meshes"]) - 1
        return mesh_for[color_key]

    def node(name, translation, scale=None, mesh_key=None, children=None, root=True):
        n = {"name": name, "translation": [round(v, 4) for v in translation]}
        if scale:
            n["scale"] = [round(v, 4) for v in scale]
        if mesh_key:
            n["mesh"] = mesh(mesh_key)
        if children:
            n["children"] = children
        gltf["nodes"].append(n)
        i = len(gltf["nodes"]) - 1
        if root:
            gltf["scenes"][0]["nodes"].append(i)
        return i

    def place_module(name: str, rect: dict, mesh_key: str, y_bottom: float = 0.0, height: float | None = None):
        """Place an authored module scaled to the footprint AABB (XZ) and target height (Y)."""
        w = (rect["maxX"] - rect["minX"]) / 1000.0
        d = (rect["maxZ"] - rect["minZ"]) / 1000.0
        cx = (rect["minX"] + rect["maxX"]) / 2000.0
        cz = (rect["minZ"] + rect["maxZ"]) / 2000.0
        h = height if height is not None else MODULE_HEIGHTS.get(mesh_key, 1.0)
        # Module local Y is [0,1]; bottom sits on y_bottom.
        node(name, [cx, y_bottom, cz], [max(w, 0.05), max(h, 0.02), max(d, 0.05)], mesh_key)

    # Water: large slab (shader replaces material on clients).
    node("Water", [-20, -0.65, 0], [80, 0.1, 80], "water")

    for r in harbor["walkable"]:
        if r["id"] == "area.pier":
            place_module("Pier", r, "pier", y_bottom=-0.02, height=MODULE_HEIGHTS["pier"])
        else:
            place_module("Ground_" + r["id"].split(".")[-1], r, "ground", y_bottom=-1.0, height=1.0)

    for r in harbor["obstacles"]:
        key = _machine_key(r["id"])
        place_module(
            "Footprint_" + r["id"].split(".")[-1],
            r,
            key,
            y_bottom=0.0,
            height=MODULE_HEIGHTS[key],
        )

    for z in harbor["zones"]:
        place_module(
            "Zone_" + z["id"].split(".")[-1],
            z,
            "zone_" + z["kind"],
            y_bottom=0.0,
            height=MODULE_HEIGHTS["zone"],
        )

    # Player: pivot at the feet, faces +z. Stylized body + nose accent + cast rod.
    body = node("PlayerBody", [0, 0.8, 0], None, "player", root=False)
    nose = node("PlayerNose", [0, 1.25, 0.32], [0.18, 0.12, 0.12], "player_nose", root=False)
    rod = node("PlayerRod", [0.28, 0.55, 0.05], None, "player_rod", root=False)
    spawn = harbor["playerSpawn"]
    player_children = [body, nose, rod]

    entry = harbor["customerEntry"]
    pool = sum(c["maxQueue"] for c in harbor["counters"]) + 2
    for i in range(pool):
        variant = f"customer_{i % 3}"
        cb = node(f"CustomerBody_{i}", [0, 0.75, 0], None, variant, root=False)
        node(f"Customer_{i}", [entry["x"] / 1000, 0, entry["z"] / 1000], children=[cb])

    # Worker pool (Phase 15): parked at entry until presenters assign on-shift staff.
    worker_kinds = ("worker_fisher", "worker_porter", "worker_operator", "worker_generic")
    for i in range(WORKER_POOL):
        kind = worker_kinds[i % len(worker_kinds)]
        wb = node(f"WorkerBody_{i}", [0, 0.78, 0], None, kind, root=False)
        node(f"Worker_{i}", [entry["x"] / 1000, 0, entry["z"] / 1000], children=[wb])

    def grid(rect, count, cols, rows_per_layer, y0, size):
        x0, x1 = rect["minX"] / 1000, rect["maxX"] / 1000
        z0, z1 = rect["minZ"] / 1000, rect["maxZ"] / 1000
        out = []
        for i in range(count):
            layer, r = divmod(i, cols * rows_per_layer)
            row, col = divmod(r, cols)
            x = x0 + (x1 - x0) * (col + 0.5) / cols
            z = z0 + (z1 - z0) * (row + 0.5) / rows_per_layer
            out.append([x, y0 + size[1] / 2 + layer * (size[1] + 0.01), z])
        return out

    zones = {z["id"]: z for z in harbor["zones"]}
    machines = {m["id"]: m for m in content["machines"]}
    short = lambda id_: id_.split(".", 1)[1]
    for st in harbor["stations"]:
        m = machines[st["machine"]]
        for i, pos in enumerate(grid(zones[st["inputZone"]], m["inputCapacityUnits"], 3, 3, 0.02, FISH_SIZE)):
            node(f"In_{short(st['id'])}_{i}", pos, FISH_SIZE, "fish")
        for i, pos in enumerate(grid(zones[st["outputZone"]], m["outputCapacityUnits"], 3, 4, 0.02, PORTION_SIZE)):
            node(f"Out_{short(st['id'])}_{i}", pos, PORTION_SIZE, "portion")
    obstacles = {o["id"]: o for o in harbor["obstacles"]}
    for c in harbor["counters"]:
        if "footprint" not in c:
            continue
        top = obstacles[c["footprint"]]
        inset = {
            "minX": top["minX"] + 150, "maxX": top["maxX"] - 150,
            "minZ": top["minZ"] + 150, "maxZ": top["maxZ"] - 150,
        }
        # Stock sits on the counter worktop (~module height * 0.7 of counter).
        stock_y = MODULE_HEIGHTS["counter"] * 0.72
        for i, pos in enumerate(grid(inset, c["capacityUnits"], 8, 2, stock_y, PORTION_SIZE)):
            node(f"Stock_{short(c['id'])}_{i}", pos, PORTION_SIZE, "portion")

    bag_max = max(
        [content["player"]["startCarryCapacityUnits"]]
        + [u["effect"]["capacityUnits"] for u in content["upgrades"] if u["effect"]["kind"] == "carry_capacity"]
    )
    bag_slots = []
    for i in range(bag_max):
        row, col = divmod(i, 2)
        pos = [(-0.12 if col == 0 else 0.12), 0.5 + row * 0.11, -0.45]
        bag_slots.append(node(f"Bag_{i}_fish", pos, FISH_SIZE, "fish", root=False))
        bag_slots.append(node(f"Bag_{i}_portion", pos, PORTION_SIZE, "portion", root=False))
    node("Player", [spawn["x"] / 1000, 0, spawn["z"] / 1000], children=player_children + bag_slots)

    fly_pool = 12
    for i in range(fly_pool):
        node(f"Fly_{i}_fish", [0, -10, 0], FISH_SIZE, "fish")
        node(f"Fly_{i}_portion", [0, -10, 0], PORTION_SIZE, "portion")

    # Phase 16: pooled world bursts (pay / celebrate / machine_done).
    for i in range(VFX_BURST_POOL):
        node(f"VfxBurst_{i}", [0, -10, 0], VFX_BURST_SIZE, "vfx_burst")

    # Finish 2.0 Phase 19: authored low-poly harbor props (theme-specific).
    if theme:
        for i, (mesh_key, translation, scale) in enumerate(THEME_PLACEMENTS[theme]):
            s = float(scale)
            short = mesh_key.replace("art_", "")
            node(
                f"HarborArt_{short}_{i}",
                list(translation),
                [s, s, s],
                mesh_key,
            )

    # Fix buffer length now that materials/meshes are known (blob already final).
    gltf["buffers"][0]["byteLength"] = len(blob)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    return (
        struct.pack("<III", 0x46546C67, 2, total)
        + struct.pack("<II", len(js), 0x4E4F534A) + js
        + struct.pack("<II", len(blob), 0x004E4942) + blob
    )


def main():
    content = json.loads((ROOT / "content" / "content-pack.json").read_text())
    out_dir = ROOT / "assets" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    for harbor in content["harbors"]:
        name = harbor["id"].split(".", 1)[1]
        out = out_dir / f"{name}_blockout.glb"
        out.write_bytes(build(content, harbor))
        print(f"wrote {out.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
