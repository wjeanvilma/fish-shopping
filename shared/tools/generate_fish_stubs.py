#!/usr/bin/env python3
"""
Writes grey-box GLB stubs for every species/product asset path in the content pack.
Clients can load these until authored art replaces them.

    python3 shared/tools/generate_fish_stubs.py
"""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FISH_COLOR = "#A9BCCB"
FISH_SCALE = [0.30, 0.09, 0.13]
PRODUCT_COLOR = "#F2B9A0"
PRODUCT_SCALE = [0.22, 0.09, 0.20]
CRATE_SCALE = [0.34, 0.18, 0.28]


def srgb_to_linear(hex_color):
    def ch(v):
        c = v / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    h = hex_color.lstrip("#")
    return [round(ch(int(h[i:i + 2], 16)), 5) for i in (0, 2, 4)] + [1.0]


def unit_cube():
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


def build_item_glb(name: str, color: str, scale: list[float]) -> bytes:
    pos, nrm, idx = unit_cube()
    pos_bytes = b"".join(struct.pack("<3f", *p) for p in pos)
    nrm_bytes = b"".join(struct.pack("<3f", *n) for n in nrm)
    idx_bytes = b"".join(struct.pack("<H", i) for i in idx)
    blob = pos_bytes + nrm_bytes + idx_bytes
    blob += b"\0" * ((4 - len(blob) % 4) % 4)

    gltf = {
        "asset": {"version": "2.0", "generator": "fish-shopping generate_fish_stubs.py"},
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(pos_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": len(pos_bytes), "byteLength": len(nrm_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": len(pos_bytes) + len(nrm_bytes), "byteLength": len(idx_bytes), "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 24, "type": "VEC3",
             "min": [-.5, -.5, -.5], "max": [.5, .5, .5]},
            {"bufferView": 1, "componentType": 5126, "count": 24, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5123, "count": 36, "type": "SCALAR"},
        ],
        "materials": [{
            "name": "item",
            "pbrMetallicRoughness": {
                "baseColorFactor": srgb_to_linear(color),
                "metallicFactor": 0.0,
                "roughnessFactor": 0.85,
            },
        }],
        "meshes": [{
            "name": "item",
            "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": 0}],
        }],
        "nodes": [{
            "name": name,
            "mesh": 0,
            "scale": scale,
        }],
        "scenes": [{"name": name, "nodes": [0]}],
        "scene": 0,
    }
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    return (struct.pack("<III", 0x46546C67, 2, total)
            + struct.pack("<II", len(js), 0x4E4F534A) + js
            + struct.pack("<II", len(blob), 0x004E4942) + blob)


def write_stub(out_dir: Path, item_id: str, asset: str, color: str, scale: list[float]) -> None:
    rel = asset[len("models/"):] if asset.startswith("models/") else asset
    out = out_dir / rel
    out.write_bytes(build_item_glb(item_id, color, scale))
    print(f"wrote {out.relative_to(ROOT.parent)}")


def main() -> int:
    content = json.loads((ROOT / "content" / "content-pack.json").read_text())
    out_dir = ROOT / "assets" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    fish_n = product_n = 0
    for sp in content["species"]:
        asset = sp.get("asset")
        if not asset:
            continue
        write_stub(out_dir, sp["id"], asset, FISH_COLOR, FISH_SCALE)
        fish_n += 1
    for prod in content["products"]:
        asset = prod.get("asset")
        if not asset:
            continue
        scale = CRATE_SCALE if "crate" in prod["id"] else PRODUCT_SCALE
        write_stub(out_dir, prod["id"], asset, PRODUCT_COLOR, scale)
        product_n += 1
    print(f"{fish_n} fish stubs, {product_n} product stubs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
