#!/usr/bin/env python3
"""
Generates a grey-box GLB for a harbor directly from shared/content/content-pack.json,
so the visible layout always matches the simulation's walkable areas, footprints and zones.

    python3 shared/tools/generate_blockout.py            # writes shared/assets/models/<harbor>_blockout.glb

No third-party packages required. Coordinates: simulation millimetres (x, z) -> glTF metres,
y up. Node names are a contract with the renderers:
    Player                        moved and rotated by the client every frame (pivot at the feet)
    Bag_<i>_fish / Bag_<i>_portion    carried-stack slots (children of Player), one of the two shown
    In_<station>_<i>              machine input slots (fish), shown when the input holds > i units
    Out_<station>_<i>             machine output slots (portions)
    Stock_<counter>_<i>           counter stock slots (portions)
    Customer_0..N                 pooled customers (root moved by the client; maxQueue + 2 for leavers)
    Fly_<i>_fish / Fly_<i>_portion    flying-transfer arcs (parked below pier when idle)
    Static nodes                  ground, pier, water, footprints, zone pads
<station> / <counter> is the content ID without its prefix, e.g. cutter_1, portions_1.
"""
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PALETTE = {
    "ground": "#D9C9A3", "pier": "#9A6B43", "water": "#2E7FA8",
    "cutter": "#008F95", "smoker": "#8B4513", "grill": "#C45C26", "counter": "#E8AF4A",
    "player": "#153449", "player_nose": "#FBF7EF",
    "customer": "#B3412E", "zone_fishing": "#7FC6E0", "zone_machine_input": "#6FD0C6",
    "zone_machine_output": "#F3D08C", "zone_counter": "#F3D08C", "zone_kiosk": "#C4A35A",
    "fish": "#A9BCCB", "portion": "#F2B9A0",
}

FISH_SIZE = [0.30, 0.09, 0.13]     # length along x
PORTION_SIZE = [0.22, 0.09, 0.20]


def srgb_to_linear(hex_color):
    def ch(v):
        c = v / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    h = hex_color.lstrip("#")
    return [round(ch(int(h[i:i + 2], 16)), 5) for i in (0, 2, 4)] + [1.0]


def unit_cube():
    """24 vertices (flat normals) of a 1x1x1 cube centred on the origin, plus 36 indices."""
    faces = [
        ((1, 0, 0), [(.5, -.5, -.5), (.5, .5, -.5), (.5, .5, .5), (.5, -.5, .5)]),
        ((-1, 0, 0), [(-.5, -.5, .5), (-.5, .5, .5), (-.5, .5, -.5), (-.5, -.5, -.5)]),
        ((0, 1, 0), [(-.5, .5, -.5), (-.5, .5, .5), (.5, .5, .5), (.5, .5, -.5)]),
        ((0, -1, 0), [(-.5, -.5, .5), (-.5, -.5, -.5), (.5, -.5, -.5), (.5, -.5, .5)]),
        ((0, 0, 1), [(.5, -.5, .5), (.5, .5, .5), (-.5, .5, .5), (-.5, -.5, .5)]),
        ((0, 0, -1), [(-.5, -.5, -.5), (-.5, .5, -.5), (.5, .5, -.5), (.5, -.5, -.5)]),
    ]
    pos, nrm, idx = [], [], []
    for n, quad in faces:
        base = len(pos)
        pos += quad
        nrm += [n] * 4
        idx += [base, base + 1, base + 2, base, base + 2, base + 3]
    return pos, nrm, idx


def build(content, harbor):
    pos, nrm, idx = unit_cube()
    pos_bytes = b"".join(struct.pack("<3f", *p) for p in pos)
    nrm_bytes = b"".join(struct.pack("<3f", *n) for n in nrm)
    idx_bytes = b"".join(struct.pack("<H", i) for i in idx)
    blob = pos_bytes + nrm_bytes + idx_bytes
    blob += b"\0" * ((4 - len(blob) % 4) % 4)

    gltf = {
        "asset": {"version": "2.0", "generator": "fish-shopping generate_blockout.py"},
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(pos_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": len(pos_bytes), "byteLength": len(nrm_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": len(pos_bytes) + len(nrm_bytes), "byteLength": len(idx_bytes), "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 24, "type": "VEC3", "min": [-.5, -.5, -.5], "max": [.5, .5, .5]},
            {"bufferView": 1, "componentType": 5126, "count": 24, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5123, "count": 36, "type": "SCALAR"},
        ],
        "materials": [], "meshes": [], "nodes": [], "scenes": [{"name": harbor["id"], "nodes": []}], "scene": 0,
    }
    mesh_for = {}

    def mesh(color_key):
        if color_key not in mesh_for:
            gltf["materials"].append({
                "name": color_key,
                "pbrMetallicRoughness": {"baseColorFactor": srgb_to_linear(PALETTE[color_key]), "metallicFactor": 0.0, "roughnessFactor": 0.85},
            })
            gltf["meshes"].append({"name": color_key, "primitives": [{
                "attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": len(gltf["materials"]) - 1}]})
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

    def box_from_rect(name, r, y_bottom, height, key):
        w, d = (r["maxX"] - r["minX"]) / 1000, (r["maxZ"] - r["minZ"]) / 1000
        cx, cz = (r["minX"] + r["maxX"]) / 2000, (r["minZ"] + r["maxZ"]) / 2000
        node(name, [cx, y_bottom + height / 2, cz], [w, height, d], key)

    # Water: a large slab below ground level, centred on the pier side.
    node("Water", [-20, -0.65, 0], [80, 0.1, 80], "water")
    for r in harbor["walkable"]:
        if r["id"] == "area.pier":
            box_from_rect("Pier", r, -0.25, 0.25, "pier")
        else:
            box_from_rect("Ground_" + r["id"].split(".")[-1], r, -1.0, 1.0, "ground")
    for r in harbor["obstacles"]:
        oid = r["id"]
        if "smoker" in oid:
            key, height = "smoker", 1.4
        elif "grill" in oid:
            key, height = "grill", 1.3
        elif "cutter" in oid:
            key, height = "cutter", 1.2
        else:
            key, height = "counter", 1.0
        box_from_rect("Footprint_" + oid.split(".")[-1], r, 0.0, height, key)
    for z in harbor["zones"]:
        box_from_rect("Zone_" + z["id"].split(".")[-1], z, 0.0, 0.02, "zone_" + z["kind"])

    # Player: pivot at the feet, faces +z. The nose marks the facing direction.
    body = node("PlayerBody", [0, 0.8, 0], [0.6, 1.6, 0.6], "player", root=False)
    nose = node("PlayerNose", [0, 1.25, 0.32], [0.25, 0.18, 0.12], "player_nose", root=False)
    spawn = harbor["playerSpawn"]
    player_children = [body, nose]

    # Customer pool, parked at the entry; clients move and show them.
    entry = harbor["customerEntry"]
    pool = max(c["maxQueue"] for c in harbor["counters"]) + 2
    for i in range(pool):
        cb = node(f"CustomerBody_{i}", [0, 0.75, 0], [0.55, 1.5, 0.55], "customer", root=False)
        node(f"Customer_{i}", [entry["x"] / 1000, 0, entry["z"] / 1000], children=[cb])

    # ---- item stacks ------------------------------------------------------------------
    def grid(rect, count, cols, rows_per_layer, y0, size):
        """Slot centres laid out in layers over a rectangle (metres)."""
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
        inset = {"minX": top["minX"] + 150, "maxX": top["maxX"] - 150, "minZ": top["minZ"] + 150, "maxZ": top["maxZ"] - 150}
        for i, pos in enumerate(grid(inset, c["capacityUnits"], 8, 2, 1.0, PORTION_SIZE)):
            node(f"Stock_{short(c['id'])}_{i}", pos, PORTION_SIZE, "portion")

    # Carried stack on the player's back: 2 columns, slot kinds swapped by visibility.
    bag_max = max([content["player"]["startCarryCapacityUnits"]] +
                  [u["effect"]["capacityUnits"] for u in content["upgrades"] if u["effect"]["kind"] == "carry_capacity"])
    bag_slots = []
    for i in range(bag_max):
        row, col = divmod(i, 2)
        pos = [(-0.12 if col == 0 else 0.12), 0.5 + row * 0.11, -0.45]
        bag_slots.append(node(f"Bag_{i}_fish", pos, [FISH_SIZE[2], FISH_SIZE[1], FISH_SIZE[0]], "fish", root=False))
        bag_slots.append(node(f"Bag_{i}_portion", pos, [PORTION_SIZE[2], PORTION_SIZE[1], PORTION_SIZE[0]], "portion", root=False))
    node("Player", [spawn["x"] / 1000, 0, spawn["z"] / 1000], children=player_children + bag_slots)

    # Flying transfer pool (Phase 21): parked below the pier; presenters move them along arcs.
    fly_pool = 12
    for i in range(fly_pool):
        node(f"Fly_{i}_fish", [0, -10, 0], FISH_SIZE, "fish")
        node(f"Fly_{i}_portion", [0, -10, 0], PORTION_SIZE, "portion")

    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    return (struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js
            + struct.pack("<II", len(blob), 0x004E4942) + blob)


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
