"""
Shared procedural glTF helpers for stylized item / blockout meshes.
No third-party packages. Coordinates: y-up metres, unit-ish local space.
"""
from __future__ import annotations

import json
import struct
from typing import Iterable


def srgb_to_linear(hex_color: str) -> list[float]:
    def ch(v: int) -> float:
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


def add_box(pos, nrm, idx, center, size) -> None:
    """Append a sized axis-aligned box (flat normals) into mesh buffers."""
    cx, cy, cz = center
    sx, sy, sz = size
    base_pos, base_nrm, base_idx = unit_cube()
    base = len(pos)
    for (x, y, z) in base_pos:
        pos.append((cx + x * sx, cy + y * sy, cz + z * sz))
    nrm.extend(base_nrm)
    idx.extend(base + i for i in base_idx)


def mesh_bounds(pos: list[tuple[float, float, float]]):
    xs = [p[0] for p in pos]
    ys = [p[1] for p in pos]
    zs = [p[2] for p in pos]
    return ([min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)])


def normalize_mesh(pos, target_length=1.0):
    """Uniformly scale so the longest axis equals target_length; recenter on origin."""
    (x0, y0, z0), (x1, y1, z1) = mesh_bounds(pos)
    cx, cy, cz = (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5
    span = max(x1 - x0, y1 - y0, z1 - z0, 1e-6)
    s = target_length / span
    out = [((x - cx) * s, (y - cy) * s, (z - cz) * s) for x, y, z in pos]
    return out, mesh_bounds(out)


def fish_silhouette(kind: str = "default"):
    """
    Stylized fish built from boxes. Length along +X.
    kind: default | flat | long | squid | eel
    """
    pos, nrm, idx = [], [], []
    if kind == "squid":
        add_box(pos, nrm, idx, (0.05, 0.05, 0), (0.35, 0.35, 0.35))  # mantle
        add_box(pos, nrm, idx, (0.28, 0.02, 0), (0.16, 0.16, 0.16))  # head
        for z in (-0.12, -0.04, 0.04, 0.12):
            add_box(pos, nrm, idx, (-0.28, -0.08, z), (0.32, 0.06, 0.05))
        add_box(pos, nrm, idx, (-0.22, 0.12, 0), (0.08, 0.22, 0.08))  # siphon
    elif kind == "eel":
        for i, x in enumerate((-0.35, -0.15, 0.05, 0.25)):
            add_box(pos, nrm, idx, (x, 0.0, 0), (0.22, 0.10 + i * 0.01, 0.10))
        add_box(pos, nrm, idx, (0.0, 0.10, 0), (0.55, 0.08, 0.03))  # dorsal
        add_box(pos, nrm, idx, (-0.48, 0.0, 0), (0.12, 0.14, 0.04))  # tip
    elif kind == "flat":
        add_box(pos, nrm, idx, (0.0, 0.0, 0), (0.55, 0.08, 0.38))
        add_box(pos, nrm, idx, (0.22, 0.05, 0.08), (0.12, 0.06, 0.12))  # eye bump
        add_box(pos, nrm, idx, (-0.32, 0.0, 0), (0.14, 0.06, 0.16))  # tail
        add_box(pos, nrm, idx, (0.05, 0.06, 0), (0.20, 0.05, 0.04))  # ridge
    elif kind == "long":
        add_box(pos, nrm, idx, (0.0, 0.0, 0), (0.70, 0.14, 0.14))
        add_box(pos, nrm, idx, (0.38, 0.02, 0), (0.18, 0.12, 0.12))
        add_box(pos, nrm, idx, (-0.42, 0.06, 0), (0.16, 0.14, 0.03))
        add_box(pos, nrm, idx, (-0.42, -0.04, 0), (0.16, 0.12, 0.03))
        add_box(pos, nrm, idx, (0.05, 0.12, 0), (0.30, 0.10, 0.03))
    else:  # default sprat / bass family
        add_box(pos, nrm, idx, (0.0, 0.0, 0), (0.50, 0.22, 0.28))
        add_box(pos, nrm, idx, (0.30, 0.02, 0), (0.22, 0.18, 0.22))
        add_box(pos, nrm, idx, (-0.30, 0.02, 0), (0.14, 0.14, 0.10))
        add_box(pos, nrm, idx, (-0.42, 0.08, 0), (0.16, 0.14, 0.04))
        add_box(pos, nrm, idx, (-0.42, -0.05, 0), (0.16, 0.12, 0.04))
        add_box(pos, nrm, idx, (0.02, 0.16, 0), (0.28, 0.12, 0.04))
        add_box(pos, nrm, idx, (0.05, -0.02, 0.16), (0.14, 0.06, 0.08))
        add_box(pos, nrm, idx, (0.05, -0.02, -0.16), (0.14, 0.06, 0.08))
    pos, bounds = normalize_mesh(pos, 1.0)
    return pos, nrm, idx, bounds


def product_silhouette(kind: str = "portion"):
    """Stylized product shapes. kind selects silhouette family."""
    pos, nrm, idx = [], [], []
    if kind == "fillet":
        add_box(pos, nrm, idx, (0.0, 0.0, 0), (0.55, 0.08, 0.28))
        add_box(pos, nrm, idx, (0.18, 0.02, 0), (0.22, 0.06, 0.20))
    elif kind == "skewer":
        add_box(pos, nrm, idx, (0.0, 0.0, 0), (0.70, 0.04, 0.04))  # stick
        for x in (-0.18, 0.0, 0.18):
            add_box(pos, nrm, idx, (x, 0.06, 0), (0.12, 0.10, 0.10))
    elif kind == "crate":
        add_box(pos, nrm, idx, (0.0, -0.06, 0), (0.55, 0.06, 0.40))  # floor
        add_box(pos, nrm, idx, (0.0, 0.08, -0.18), (0.55, 0.22, 0.04))
        add_box(pos, nrm, idx, (0.0, 0.08, 0.18), (0.55, 0.22, 0.04))
        add_box(pos, nrm, idx, (-0.26, 0.08, 0), (0.04, 0.22, 0.40))
        add_box(pos, nrm, idx, (0.26, 0.08, 0), (0.04, 0.22, 0.40))
        add_box(pos, nrm, idx, (0.0, 0.02, 0), (0.40, 0.08, 0.28))  # contents
    elif kind == "carton":
        add_box(pos, nrm, idx, (0.0, 0.0, 0), (0.42, 0.28, 0.32))
        add_box(pos, nrm, idx, (0.0, 0.16, 0), (0.44, 0.04, 0.34))  # lid
        add_box(pos, nrm, idx, (0.0, 0.20, 0), (0.20, 0.04, 0.08))  # handle
    elif kind == "soup":
        add_box(pos, nrm, idx, (0.0, -0.04, 0), (0.36, 0.08, 0.36))  # bowl base
        add_box(pos, nrm, idx, (0.0, 0.06, 0), (0.40, 0.14, 0.40))  # rim
        add_box(pos, nrm, idx, (0.0, 0.10, 0), (0.30, 0.06, 0.30))  # broth
    elif kind == "diced":
        for i, (x, z) in enumerate(((-0.12, -0.10), (0.10, -0.08), (-0.08, 0.10), (0.12, 0.08), (0.0, 0.0))):
            add_box(pos, nrm, idx, (x, 0.02 + (i % 2) * 0.06, z), (0.12, 0.10, 0.12))
    elif kind == "chips":
        add_box(pos, nrm, idx, (-0.08, 0.0, 0), (0.30, 0.10, 0.22))  # fish
        for z in (-0.10, 0.0, 0.10):
            add_box(pos, nrm, idx, (0.18, 0.02, z), (0.20, 0.06, 0.05))
    elif kind == "fried":
        add_box(pos, nrm, idx, (0.0, 0.0, 0), (0.42, 0.14, 0.28))
        add_box(pos, nrm, idx, (0.0, 0.10, 0), (0.36, 0.06, 0.22))
        add_box(pos, nrm, idx, (0.18, 0.04, 0.12), (0.08, 0.08, 0.08))  # crumb
    else:  # portion / premium
        add_box(pos, nrm, idx, (0.0, 0.0, 0), (0.40, 0.14, 0.32))
        add_box(pos, nrm, idx, (0.0, 0.08, 0), (0.34, 0.06, 0.26))
    pos, bounds = normalize_mesh(pos, 1.0)
    return pos, nrm, idx, bounds


def pack_geometry(parts: Iterable[tuple[list, list, list, tuple]]) -> tuple[bytes, list[dict], list[dict]]:
    """
    Pack one or more (pos, nrm, idx, bounds) meshes into a single BIN blob.
    Returns (blob, bufferViews, accessors) with interleaved mesh ranges.
    """
    blob = b""
    buffer_views = []
    accessors = []
    for pos, nrm, idx, bounds in parts:
        pos_bytes = b"".join(struct.pack("<3f", *p) for p in pos)
        nrm_bytes = b"".join(struct.pack("<3f", *n) for n in nrm)
        idx_bytes = b"".join(struct.pack("<H", i) for i in idx)
        if len(idx_bytes) % 4:
            idx_bytes += b"\0" * (4 - len(idx_bytes) % 4)
        for chunk, target, count, typ, extra in (
            (pos_bytes, 34962, len(pos), "VEC3", {"min": [round(v, 5) for v in bounds[0]],
                                                  "max": [round(v, 5) for v in bounds[1]]}),
            (nrm_bytes, 34962, len(nrm), "VEC3", {}),
            (idx_bytes, 34963, len(idx), "SCALAR", {}),
        ):
            buffer_views.append({
                "buffer": 0,
                "byteOffset": len(blob),
                "byteLength": len(chunk) if target != 34963 else len(idx) * 2,
                "target": target,
            })
            acc = {
                "bufferView": len(buffer_views) - 1,
                "componentType": 5126 if typ != "SCALAR" else 5123,
                "count": count,
                "type": typ,
            }
            acc.update(extra)
            accessors.append(acc)
            blob += chunk
    blob += b"\0" * ((4 - len(blob) % 4) % 4)
    return blob, buffer_views, accessors


def build_glb(
    *,
    name: str,
    generator: str,
    color: str,
    pos,
    nrm,
    idx,
    bounds,
    scale: list[float] | None = None,
    extras: dict | None = None,
) -> bytes:
    blob, buffer_views, accessors = pack_geometry([(pos, nrm, idx, bounds)])
    node = {"name": name, "mesh": 0}
    if scale:
        node["scale"] = [round(v, 4) for v in scale]
    gltf = {
        "asset": {"version": "2.0", "generator": generator},
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "materials": [{
            "name": "item",
            "pbrMetallicRoughness": {
                "baseColorFactor": srgb_to_linear(color),
                "metallicFactor": 0.05,
                "roughnessFactor": 0.55,
            },
        }],
        "meshes": [{
            "name": "item",
            "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": 0}],
        }],
        "nodes": [node],
        "scenes": [{"name": name, "nodes": [0]}],
        "scene": 0,
    }
    if extras:
        gltf["extras"] = extras
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    return (
        struct.pack("<III", 0x46546C67, 2, total)
        + struct.pack("<II", len(js), 0x4E4F534A) + js
        + struct.pack("<II", len(blob), 0x004E4942) + blob
    )
