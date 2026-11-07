#!/usr/bin/env python3
"""
Phase 15 — write stylized player / customer / worker character GLBs.

    python3 shared/tools/generate_character_modules.py

Outputs shared/assets/models/characters/<name>.glb. Harbor blockouts embed the same
geometry while keeping Player / Customer_* / Worker_* socket names.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from character_modules import CHARACTER_BUILDERS, CHARACTER_COLORS  # noqa: E402
from glb_geometry import build_glb  # noqa: E402

GENERATOR = "fish-shopping generate_character_modules.py"


def main() -> int:
    out_dir = ROOT / "assets" / "models" / "characters"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, builder in CHARACTER_BUILDERS.items():
        pos, nrm, idx, bounds = builder()
        path = out_dir / f"{name}.glb"
        path.write_bytes(build_glb(
            name=f"character.{name}",
            generator=GENERATOR,
            color=CHARACTER_COLORS[name],
            pos=pos,
            nrm=nrm,
            idx=idx,
            bounds=bounds,
            extras={"stylized": True, "phase": 15, "character": name},
        ))
        print(f"wrote {path.relative_to(ROOT.parent)}")
    print(f"{len(CHARACTER_BUILDERS)} character modules")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
