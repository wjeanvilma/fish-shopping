#!/usr/bin/env python3
"""
Generates a harbor GLB from shared/content/content-pack.json so the visible layout
matches the simulation's walkable areas, footprints and zones.

Phase 14 replaces grey-box pier / machine / counter boxes with authored modules
(shared/tools/env_modules.py → models/modules/*.glb). Phase 15 replaces grey-box
characters with stylized player / customer / worker meshes (models/characters/*.glb)
and adds a Worker_* pool. Finish 2.0 Phase 19 / Finish 3.0 Phase 8 / Finish 4.0
Phase 9 add per-harbor HarborArt_* scenic props + palette themes
(shared/tools/harbor_themes.py) so all 8 harbors are beyond grey-box blockout.
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
    encode_glb,
    srgb_to_linear,
    unit_cube,
)
import cozy_art  # noqa: E402
from cozy_theme_art import COZY_THEME_ART_BUILDERS  # noqa: E402
from cozy_kit import Mesh, Rng, pack_parts  # noqa: E402
import math  # noqa: E402
from harbor_themes import (  # noqa: E402
    HARBOR_ART_BUILDERS,
    HARBOR_ART_COLORS,
    HARBOR_ART_MARKER,
    HARBOR_FINISH5_5A_MARKER,
    HARBOR_FINISH5_5A_THEMES,
    HARBOR_FINISH5_5B_MARKER,
    HARBOR_FINISH5_5B_THEMES,
    HARBOR_SCENIC_MARKER,
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
    for key in (
        "smoker", "grill", "chiller", "fryer", "packer", "steamer", "kiln",
        "press", "pickler", "braiser", "glazer", "poacher", "canner",
        "roaster", "fermenter", "cutter", "counter",
    ):
        if key in oid:
            return key
    return "counter"


def _is_deck(area_id: str) -> bool:
    return any(k in area_id for k in ("pier", "dock", "spur"))


def _rect_dist(rect: dict, x: float, z: float) -> float:
    """Distance in metres from (x, z) metres to a millimetre rectangle (0 inside)."""
    dx = max(rect["minX"] / 1000 - x, 0, x - rect["maxX"] / 1000)
    dz = max(rect["minZ"] / 1000 - z, 0, z - rect["maxZ"] / 1000)
    return (dx * dx + dz * dz) ** 0.5


def settle_theme_art(harbor, x: float, z: float, radius: float = 0.9):
    """
    Cozy art pass 5: nudge a theme prop off zones / machines / queues / spawn so it never
    covers something the player needs to see. Water props (outside every walkable rect)
    stay where they are. Deterministic ring search in 0.5 m steps.
    """
    walk = harbor["walkable"]
    if not any(_rect_dist(w, x, z) == 0 for w in walk):
        return x, z
    blockers = list(harbor["zones"]) + list(harbor["obstacles"])
    points = [(harbor["playerSpawn"]["x"] / 1000, harbor["playerSpawn"]["z"] / 1000, 1.8),
              (harbor["customerEntry"]["x"] / 1000, harbor["customerEntry"]["z"] / 1000, 1.4)]
    for c in harbor["counters"]:
        for i in range(c["maxQueue"]):
            points.append(((c["queueAnchor"]["x"] + i * c["queueStep"]["x"]) / 1000,
                           (c["queueAnchor"]["z"] + i * c["queueStep"]["z"]) / 1000, 0.9))

    def ok(px, pz):
        if not any(_rect_dist(w, px, pz) == 0 for w in walk):
            return False
        if any(_rect_dist(b, px, pz) < radius for b in blockers):
            return False
        return all(((px - qx) ** 2 + (pz - qz) ** 2) ** 0.5 >= qr + radius * 0.6 for qx, qz, qr in points)

    if ok(x, z):
        return x, z
    for ring in range(1, 13):
        r = ring * 0.5
        steps = 8 * ring
        for k in range(steps):
            a = k / steps * math.tau
            px, pz = x + math.cos(a) * r, z + math.sin(a) * r
            if ok(px, pz):
                return round(px, 3), round(pz, 3)
    return x, z


def scatter_props(content, harbor, rng):
    """
    Deterministic cozy prop layout (presentation-only). Land props sit in a band just inside
    the quay edge; water props sit outside every walkable rect. Nothing lands on zones,
    obstacles, queue slots, the customer entry, the spawn, or the decor placement area.
    Returns a list of (kind, x, z, yaw).
    """
    walk = harbor["walkable"]
    land = [w for w in walk if not _is_deck(w["id"])]
    decks = [w for w in walk if _is_deck(w["id"])]
    blockers = list(harbor["zones"]) + list(harbor["obstacles"])
    points = [(harbor["playerSpawn"]["x"] / 1000, harbor["playerSpawn"]["z"] / 1000, 2.2),
              (harbor["customerEntry"]["x"] / 1000, harbor["customerEntry"]["z"] / 1000, 1.6)]
    for c in harbor["counters"]:
        for i in range(c["maxQueue"]):
            points.append(((c["queueAnchor"]["x"] + i * c["queueStep"]["x"]) / 1000,
                           (c["queueAnchor"]["z"] + i * c["queueStep"]["z"]) / 1000, 1.1))
    placed = []

    def free(x, z, r, on_land):
        if any(_rect_dist(b, x, z) < r + 0.5 for b in blockers):
            return False
        if any(((x - px) ** 2 + (z - pz) ** 2) ** 0.5 < pr + r for px, pz, pr in points):
            return False
        if any(((x - px) ** 2 + (z - pz) ** 2) ** 0.5 < r + pr2 for _, px, pz, _, pr2 in placed):
            return False
        if on_land:
            if any(_rect_dist(d, x, z) < 2.4 for d in decks):
                return False
        else:
            if any(_rect_dist(w, x, z) < r + 0.7 for w in walk):
                return False
        return True

    land_kinds = ["barrel", "crates", "fish_crate", "planter", "bench", "bollard", "barrel", "umbrella"]
    lamp_count = 0
    for rect in land:
        x0, x1 = rect["minX"] / 1000, rect["maxX"] / 1000
        z0, z1 = rect["minZ"] / 1000, rect["maxZ"] / 1000
        inset = 0.75
        edges = [((x0 + inset, z0 + inset), (x1 - inset, z0 + inset), 0.0),
                 ((x1 - inset, z0 + inset), (x1 - inset, z1 - inset), -1.5708),
                 ((x1 - inset, z1 - inset), (x0 + inset, z1 - inset), 3.1416),
                 ((x0 + inset, z1 - inset), (x0 + inset, z0 + inset), 1.5708)]
        for (ax, az), (bx, bz), yaw in edges:
            length = ((bx - ax) ** 2 + (bz - az) ** 2) ** 0.5
            steps = int(length / 2.1)
            for k in range(1, steps):
                t = k / steps + rng.range(-0.04, 0.04)
                x, z = ax + (bx - ax) * t, az + (bz - az) * t
                if k % 3 == 0 and lamp_count < 8:
                    kind, r = "lamp", 0.4
                else:
                    kind = land_kinds[int(rng.next() * len(land_kinds))]
                    r = 0.75 if kind in ("bench", "umbrella", "crates") else 0.5
                if free(x, z, r, True):
                    placed.append((kind, x, z, yaw + rng.range(-0.2, 0.2), r))
                    if kind == "lamp":
                        lamp_count += 1
    # Water props: boats beside decks, buoys and rocks offshore.
    for d in decks:
        x0, x1 = d["minX"] / 1000, d["maxX"] / 1000
        z0, z1 = d["minZ"] / 1000, d["maxZ"] / 1000
        long_x = (x1 - x0) >= (z1 - z0)
        for side in (-1, 1):
            if long_x:
                x = (x0 + x1) / 2 + rng.range(-1.5, 1.5)
                z = (z0 - 2.4) if side < 0 else (z1 + 2.4)
                yaw = 0.0
            else:
                x = (x0 - 2.4) if side < 0 else (x1 + 2.4)
                z = (z0 + z1) / 2 + rng.range(-1.5, 1.5)
                yaw = 1.5708
            if free(x, z, 1.3, False) and rng.next() > 0.25:
                placed.append(("boat", x, z, yaw, 1.3))
    for rect in land:
        for _ in range(10):
            side = int(rng.next() * 4)
            x0, x1 = rect["minX"] / 1000, rect["maxX"] / 1000
            z0, z1 = rect["minZ"] / 1000, rect["maxZ"] / 1000
            off = rng.range(1.6, 3.2)
            if side == 0:
                x, z = rng.range(x0, x1), z0 - off
            elif side == 1:
                x, z = rng.range(x0, x1), z1 + off
            elif side == 2:
                x, z = x0 - off, rng.range(z0, z1)
            else:
                x, z = x1 + off, rng.range(z0, z1)
            kind = "rock" if rng.next() < 0.6 else "buoy"
            r = 0.9 if kind == "rock" else 0.5
            if free(x, z, r, False):
                placed.append((kind, x, z, rng.range(0, 6.28), r))
    return [(k, x, z, yaw) for k, x, z, yaw, _ in placed]


DECOR_COLORS = ["#D9583B", "#2C9C9A", "#E8B04A", "#5B9BD5", "#8E6BB8", "#4E9A5E", "#F28C5A", "#3E6FA8"]


def decor_mesh(decor_id: str, i: int):
    """Placeable decor models (one hidden Decor_<short> node per decor item)."""
    from cozy_kit import Mesh as _M
    color = DECOR_COLORS[i % len(DECOR_COLORS)]
    m = _M()
    if "lantern" in decor_id:
        for x in (-0.55, 0.55):
            m.cylinder((x, 0, 0), 0.04, 1.9, cozy_art.WOOD_DARK, seg=8, ao=None)
        for k in range(7):
            x = -0.5 + k / 6
            sag = 1.78 - 0.18 * (1 - (2 * k / 6 - 1) ** 2)
            m.sphere((x, sag, 0), 0.06, cozy_art.GLOW if k % 2 == 0 else "#FFB36B", seg=6, rings=4, ao=None)
        m.box((0, 1.82, 0), (1.1, 0.01, 0.01), "#3E4448", ao=None)
    elif "flower" in decor_id:
        planter = cozy_art.prop_planter("#E86A8A")
        m.append(planter, (0, 0, -0.25))
        m.append(cozy_art.prop_planter("#F2C230"), (0, 0, 0.25))
    else:
        # Flags, pennants and bunting: pole + cloth in a distinct colour per item.
        m.cylinder((0, 0, 0), 0.12, 0.08, "#3E4448", seg=10, ao=None)
        m.cylinder((0, 0.08, 0), 0.03, 2.3, cozy_art.WOOD_DARK, seg=8, ao=None)
        m.sphere((0, 2.42, 0), 0.06, cozy_art.GOLD, seg=6, rings=4, ao=None)
        if "bunting" in decor_id:
            for k in range(6):
                x = 0.05 + k * 0.18
                m.quad((x, 2.2, 0), (x + 0.09, 1.95, 0), (x + 0.18, 2.2, 0), (x + 0.18, 2.2, 0), (0, 0, -1),
                       DECOR_COLORS[(i + k) % len(DECOR_COLORS)], jitter=0.0, ao=None)
                m.quad((x + 0.18, 2.2, 0), (x + 0.09, 1.95, 0), (x, 2.2, 0), (x, 2.2, 0), (0, 0, 1),
                       DECOR_COLORS[(i + k) % len(DECOR_COLORS)], jitter=0.0, ao=None)
        elif "pennant" in decor_id:
            m.quad((0.03, 2.3, 0), (0.03, 1.8, 0), (0.95, 2.05, 0), (0.95, 2.05, 0), (0, 0, -1), color, jitter=0.0, ao=None)
            m.quad((0.95, 2.05, 0), (0.03, 1.8, 0), (0.03, 2.3, 0), (0.03, 2.3, 0), (0, 0, 1), color, jitter=0.0, ao=None)
        else:
            m.box((0.45, 2.02, 0), (0.85, 0.52, 0.02), color, jitter=0.0, ao=None)
            m.box((0.45, 2.02, -0.012), (0.85, 0.12, 0.005), cozy_art.CREAM, jitter=0.0, ao=None)
    return m


def build(content, harbor):
    theme = theme_for_harbor(harbor["id"])
    palette = {**PALETTE, **(THEME_PALETTE.get(theme, {}) if theme else {})}
    rng = Rng(sum(ord(ch) * (i + 1) for i, ch in enumerate(harbor["id"])))
    cube_pos, cube_nrm, cube_idx = unit_cube()

    # Part registry: key -> index into pack_parts output. Order fixes accessor indices
    # (cube=0..2, fish POSITION=3 is part of the asset contract).
    parts: list = []
    part_index: dict[str, int] = {}

    def add_part(key: str, part) -> None:
        part_index[key] = len(parts)
        parts.append(part)

    add_part("cube", (cube_pos, cube_nrm, cube_idx, ([-.5, -.5, -.5], [.5, .5, .5])))
    add_part("fish", cozy_art.fish_item())
    add_part("portion", cozy_art.portion_item())
    add_part("zone", cozy_art.zone_pad())
    for key, builder in cozy_art.MACHINE_BUILDERS.items():
        add_part(key, builder(palette.get(key, MODULE_COLORS.get(key, "#888888"))))
    for key, builder in cozy_art.character_builders().items():
        add_part(key, builder())
    walk_parts = []
    for r in harbor["walkable"]:
        key = "area_" + r["id"].split(".")[-1]
        if _is_deck(r["id"]):
            add_part(key, cozy_art.pier(r, palette.get("pier", "#C9A66B"), rng))
        else:
            add_part(key, cozy_art.ground(r, palette.get("ground", "#8FA37A"), rng))
        walk_parts.append((r, key))
    foam = Mesh()
    for r in harbor["walkable"]:
        foam.append(cozy_art.foam_ring(r))
    add_part("foam", foam)
    add_part("vfx_burst", cozy_art.burst_sparkle())
    lamp_post, lamp_glow = cozy_art.prop_lamp()
    add_part("prop_lamp", lamp_post)
    add_part("lamp_glow", lamp_glow)
    hull = rng.pick(["#D9583B", "#2C6E9E", "#E8B04A", "#3E8A6A"])
    for key, mesh_obj in (
        ("prop_barrel", cozy_art.prop_barrel()), ("prop_crates", cozy_art.prop_crates()),
        ("prop_fish_crate", cozy_art.prop_fish_crate()), ("prop_rock", cozy_art.prop_rock(Rng(rng.s))),
        ("prop_bollard", cozy_art.prop_bollard()), ("prop_planter", cozy_art.prop_planter("#E86A8A")),
        ("prop_bench", cozy_art.prop_bench()), ("prop_boat", cozy_art.prop_boat(hull)),
        ("prop_buoy", cozy_art.prop_buoy()), ("prop_umbrella", cozy_art.prop_umbrella_table(rng.pick(["#D9583B", "#2C9C9A", "#F2C230"]))),
    ):
        add_part(key, mesh_obj)
    decor_items = content.get("decor", {}).get("items", [])
    for i, d in enumerate(decor_items):
        add_part("decor_" + d["id"].split(".", 1)[1], decor_mesh(d["id"], i))
    if theme:
        needed = {mesh_key for mesh_key, _, _ in THEME_PLACEMENTS[theme]}
        for name in sorted(needed):
            add_part(name, COZY_THEME_ART_BUILDERS[name]())

    blob, buffer_views, accessors, attrs = pack_parts(parts)

    extras = {
        "itemArt": "stylized-phase-13",
        "envArt": "modular-phase-14",
        "characterArt": "clips-phase-15",
        "machineVfx": "phase-16",
        "cozyArt": cozy_art.COZY_ART_MARKER,
    }
    if theme:
        env_bits = [
            "modular-phase-14",
            "harbor-art-19",
            HARBOR_SCENIC_MARKER,
            cozy_art.COZY_ART_MARKER,
        ]
        if theme in HARBOR_FINISH5_5A_THEMES:
            env_bits.append(HARBOR_FINISH5_5A_MARKER)
        if theme in HARBOR_FINISH5_5B_THEMES:
            env_bits.append(HARBOR_FINISH5_5B_MARKER)
        env_bits.append(cozy_art.ATMOSPHERE_FINISH5_MARKER)
        env_bits.append(cozy_art.ATMOSPHERE_FINISH6_MARKER)
        extras["envArt"] = "+".join(env_bits)
        extras["harborArt"] = HARBOR_ART_MARKER
        extras["harborTheme"] = theme
        extras["harborScenic"] = HARBOR_SCENIC_MARKER
        extras["atmosphereFinish5"] = cozy_art.ATMOSPHERE_FINISH5_MARKER
        extras["atmosphereFinish6"] = cozy_art.ATMOSPHERE_FINISH6_MARKER
        if theme in HARBOR_FINISH5_5A_THEMES:
            extras["harborFinish5"] = HARBOR_FINISH5_5A_MARKER
        elif theme in HARBOR_FINISH5_5B_THEMES:
            extras["harborFinish5"] = HARBOR_FINISH5_5B_MARKER

    gltf = {
        "asset": {"version": "2.0", "generator": "fish-shopping generate_blockout.py"},
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "materials": [], "meshes": [], "nodes": [], "scenes": [{"name": harbor["id"], "nodes": []}], "scene": 0,
        "extras": extras,
    }
    mesh_for: dict[str, int] = {}

    def material(name: str, color_hex: str | None, *, rough=0.8, metal=0.0, emissive=None, alpha=None,
                 double=False) -> int:
        mat = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": srgb_to_linear(color_hex) if color_hex else [1.0, 1.0, 1.0, 1.0],
                "metallicFactor": metal,
                "roughnessFactor": rough,
            },
        }
        if emissive:
            mat["emissiveFactor"] = emissive
        if alpha is not None:
            mat["pbrMetallicRoughness"]["baseColorFactor"][3] = alpha
            mat["alphaMode"] = "BLEND"
        if double:
            mat["doubleSided"] = True
        gltf["materials"].append(mat)
        return len(gltf["materials"]) - 1

    def mesh(key: str, part_key: str | None = None, **mat_kwargs) -> int:
        """Mesh for `key`; vertex-coloured parts get a white material unless a colour is given."""
        if key in mesh_for:
            return mesh_for[key]
        pk = part_key or key
        a = attrs[part_index[pk]]
        color = mat_kwargs.pop("color", None)
        if color is None and "COLOR_0" not in a:
            color = palette.get(key, "#888888")
        mi = material(key, color, **mat_kwargs)
        prim_attrs = {k: v for k, v in a.items() if k != "indices"}
        gltf["meshes"].append({"name": key, "primitives": [{"attributes": prim_attrs, "indices": a["indices"], "material": mi}]})
        mesh_for[key] = len(gltf["meshes"]) - 1
        return mesh_for[key]

    def node(name, translation, scale=None, mesh_index=None, children=None, root=True, rotation_y=None):
        n = {"name": name, "translation": [round(v, 4) for v in translation]}
        if rotation_y is not None:
            n["rotation"] = [0.0, round(math.sin(rotation_y / 2), 5), 0.0, round(math.cos(rotation_y / 2), 5)]
        if scale:
            n["scale"] = [round(v, 4) for v in scale]
        if mesh_index is not None:
            n["mesh"] = mesh_index
        if children:
            n["children"] = children
        gltf["nodes"].append(n)
        i = len(gltf["nodes"]) - 1
        if root:
            gltf["scenes"][0]["nodes"].append(i)
        return i

    def rect_box(rect):
        w = (rect["maxX"] - rect["minX"]) / 1000.0
        d = (rect["maxZ"] - rect["minZ"]) / 1000.0
        return (rect["minX"] + rect["maxX"]) / 2000.0, (rect["minZ"] + rect["maxZ"]) / 2000.0, w, d

    # Water: large slab (clients replace the material; the web client also subdivides it).
    node("Water", [-20, -0.65, 0], [80, 0.1, 80], mesh("water", "cube"))
    node("Foam", [0, 0, 0], None, mesh("foam", alpha=0.6, rough=0.4))
    for r, key in walk_parts:
        name = "Pier" if r["id"] == "area.pier" else "Ground_" + r["id"].split(".")[-1]
        node(name, [0, 0, 0], None, mesh(key, rough=0.85))
    for r in harbor["obstacles"]:
        key = _machine_key(r["id"])
        cx, cz, w, d = rect_box(r)
        node("Footprint_" + r["id"].split(".")[-1], [cx, 0.0, cz], [max(w, 0.05), 1.0, max(d, 0.05)],
             mesh(key, rough=0.6))
    for z in harbor["zones"]:
        cx, cz, w, d = rect_box(z)
        zk = "zone_" + z["kind"]
        node("Zone_" + z["id"].split(".")[-1], [cx, 0.0, cz], [max(w, 0.05), 1.0, max(d, 0.05)],
             mesh(zk, "zone", color=palette.get(zk, "#7FC6E0"), rough=0.7))

    # Player: pivot at the feet, faces +z. Body + small badge accent (PlayerNose) + rod.
    body = node("PlayerBody", [0, 0.8, 0], None, mesh("player", rough=0.7), root=False)
    nose = node("PlayerNose", [0, 1.02, 0.17], [0.07, 0.07, 0.03], mesh("player_nose", "cube"), root=False)
    rod = node("PlayerRod", [0.28, 0.55, 0.05], None, mesh("player_rod", rough=0.6), root=False)
    spawn = harbor["playerSpawn"]
    player_children = [body, nose, rod]
    entry = harbor["customerEntry"]
    pool = sum(c["maxQueue"] for c in harbor["counters"]) + 2
    for i in range(pool):
        variant = f"customer_{i % 3}"
        cb = node(f"CustomerBody_{i}", [0, 0.75, 0], None, mesh(variant, rough=0.75), root=False)
        node(f"Customer_{i}", [entry["x"] / 1000, 0, entry["z"] / 1000], children=[cb])
    worker_kinds = ("worker_fisher", "worker_porter", "worker_operator", "worker_generic")
    for i in range(WORKER_POOL):
        kind = worker_kinds[i % len(worker_kinds)]
        wb = node(f"WorkerBody_{i}", [0, 0.78, 0], None, mesh(kind, rough=0.75), root=False)
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
    fish_mesh = mesh("fish", rough=0.45, metal=0.1)
    portion_mesh = mesh("portion", rough=0.6)
    for st in harbor["stations"]:
        m = machines[st["machine"]]
        for i, pos in enumerate(grid(zones[st["inputZone"]], m["inputCapacityUnits"], 3, 3, 0.05, FISH_SIZE)):
            node(f"In_{short(st['id'])}_{i}", pos, FISH_SIZE, fish_mesh)
        for i, pos in enumerate(grid(zones[st["outputZone"]], m["outputCapacityUnits"], 3, 4, 0.05, PORTION_SIZE)):
            node(f"Out_{short(st['id'])}_{i}", pos, PORTION_SIZE, portion_mesh)
    obstacles = {o["id"]: o for o in harbor["obstacles"]}
    for c in harbor["counters"]:
        if "footprint" not in c:
            continue
        top = obstacles[c["footprint"]]
        inset = {
            "minX": top["minX"] + 150, "maxX": top["maxX"] - 150,
            "minZ": top["minZ"] + 150, "maxZ": top["maxZ"] - 150,
        }
        stock_y = MODULE_HEIGHTS["counter"] * 0.72
        for i, pos in enumerate(grid(inset, c["capacityUnits"], 8, 2, stock_y, PORTION_SIZE)):
            node(f"Stock_{short(c['id'])}_{i}", pos, PORTION_SIZE, portion_mesh)

    bag_max = max(
        [content["player"]["startCarryCapacityUnits"]]
        + [u["effect"]["capacityUnits"] for u in content["upgrades"] if u["effect"]["kind"] == "carry_capacity"]
    )
    bag_slots = []
    for i in range(bag_max):
        row, col = divmod(i, 2)
        pos = [(-0.12 if col == 0 else 0.12), 0.5 + row * 0.11, -0.45]
        bag_slots.append(node(f"Bag_{i}_fish", pos, FISH_SIZE, fish_mesh, root=False))
        bag_slots.append(node(f"Bag_{i}_portion", pos, PORTION_SIZE, portion_mesh, root=False))
    node("Player", [spawn["x"] / 1000, 0, spawn["z"] / 1000], children=player_children + bag_slots)

    fly_pool = 12
    for i in range(fly_pool):
        node(f"Fly_{i}_fish", [0, -10, 0], FISH_SIZE, fish_mesh)
        node(f"Fly_{i}_portion", [0, -10, 0], PORTION_SIZE, portion_mesh)
    for i in range(VFX_BURST_POOL):
        node(f"VfxBurst_{i}", [0, -10, 0], VFX_BURST_SIZE, mesh("vfx_burst", color="#F6E27A", emissive=[0.55, 0.45, 0.12]))

    # Cozy props (static) + lamps with a separately named glow mesh for night lighting.
    glow_mesh = mesh("lamp_glow", color="#FFE2A8", emissive=[1.0, 0.78, 0.42], rough=0.5)
    lamp_i = 0
    boat_i = 0
    for i, (kind, x, z, yaw) in enumerate(scatter_props(content, harbor, rng)):
        y = -0.58 if kind in ("boat", "buoy") else (-0.75 if kind == "rock" else 0.0)
        if kind == "lamp":
            g = node(f"LampGlow_{lamp_i}", [0, 0, 0], None, glow_mesh, root=False)
            node(f"Lamp_{lamp_i}", [x, y, z], None, mesh("prop_lamp", rough=0.5, metal=0.3), children=[g], rotation_y=yaw)
            lamp_i += 1
        elif kind == "boat":
            node(f"Boat_{boat_i}", [x, y, z], None, mesh("prop_boat", rough=0.7), rotation_y=yaw)
            boat_i += 1
        else:
            node(f"Prop_{kind}_{i}", [x, y, z], None, mesh("prop_" + kind, rough=0.8), rotation_y=yaw)

    # Placeable decor: one hidden node per decor item, parked below the world.
    for d in decor_items:
        key = "decor_" + d["id"].split(".", 1)[1]
        node("Decor_" + d["id"].split(".", 1)[1], [0, -20, 0], None, mesh(key, rough=0.7, double=True))

    if theme:
        for i, (mesh_key, translation, scale) in enumerate(THEME_PLACEMENTS[theme]):
            s = float(scale)
            short_key = mesh_key.replace("art_", "")
            tx, tz = settle_theme_art(harbor, translation[0], translation[2], 0.6 + 0.5 * s)
            node(f"HarborArt_{short_key}_{i}", [tx, translation[1], tz], [s, s, s], mesh(mesh_key, rough=0.75))

    return encode_glb(gltf, blob)


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
