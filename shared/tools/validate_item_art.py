#!/usr/bin/env python3
"""
Phase 13 — validate stylized species/product GLBs against the content-pack path contract.

Checks:
  - every species/product asset path exists under shared/assets/
  - file is a glTF 2.0 GLB (glTF magic)
  - generator marks stylized item art (not grey-box cube stubs)
  - mesh has more than a unit-cube vertex count

    python3 shared/tools/validate_item_art.py
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
GENERATOR_MARK = "generate_item_art"
MIN_VERTS = 25  # unit cube = 24


def read_gltf_json(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 20:
        raise ValueError(f"{path.name}: too small")
    magic, version, _length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67:
        raise ValueError(f"{path.name}: not a GLB (bad magic)")
    if version != 2:
        raise ValueError(f"{path.name}: expected glTF 2, got {version}")
    chunk_len, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A:
        raise ValueError(f"{path.name}: first chunk is not JSON")
    raw = data[20:20 + chunk_len].decode("utf-8").rstrip("\x00")
    return json.loads(raw)


def validate_item(path: Path) -> None:
    gltf = read_gltf_json(path)
    gen = gltf.get("asset", {}).get("generator", "")
    if GENERATOR_MARK not in gen:
        raise ValueError(f"{path.name}: generator {gen!r} missing {GENERATOR_MARK!r}")
    extras = gltf.get("extras") or {}
    if not extras.get("stylized"):
        raise ValueError(f"{path.name}: extras.stylized missing")
    accessors = gltf.get("accessors") or []
    if not accessors:
        raise ValueError(f"{path.name}: no accessors")
    verts = accessors[0].get("count", 0)
    if verts < MIN_VERTS:
        raise ValueError(f"{path.name}: vertex count {verts} looks like a grey-box cube")


def main() -> int:
    content = json.loads((ROOT / "content" / "content-pack.json").read_text())
    errors: list[str] = []
    checked = 0
    for group in ("species", "products"):
        for row in content[group]:
            asset = row.get("asset")
            if not asset:
                errors.append(f"{row['id']}: missing asset")
                continue
            path = ASSETS / asset
            checked += 1
            if not path.is_file():
                errors.append(f"{row['id']}: missing file {asset}")
                continue
            try:
                validate_item(path)
            except ValueError as e:
                errors.append(str(e))
    if errors:
        print(f"FAIL ({len(errors)} / {checked})")
        for e in errors:
            print(" ", e)
        return 1
    print(f"OK {checked} stylized item GLBs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
