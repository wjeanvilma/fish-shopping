#!/usr/bin/env python3
"""
Phase 14 — write authored pier / machine / counter module GLBs.

    python3 shared/tools/generate_env_modules.py

Outputs shared/assets/models/modules/<name>.glb. Harbor blockouts embed the same
geometry via generate_blockout.py while keeping presenter socket names.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from env_modules import MODULE_BUILDERS, MODULE_COLORS  # noqa: E402
from glb_geometry import build_glb  # noqa: E402

GENERATOR = "fish-shopping generate_env_modules.py"


def main() -> int:
    out_dir = ROOT / "assets" / "models" / "modules"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, builder in MODULE_BUILDERS.items():
        pos, nrm, idx, bounds = builder()
        path = out_dir / f"{name}.glb"
        path.write_bytes(build_glb(
            name=f"module.{name}",
            generator=GENERATOR,
            color=MODULE_COLORS[name],
            pos=pos,
            nrm=nrm,
            idx=idx,
            bounds=bounds,
            extras={"stylized": True, "phase": 14, "module": name},
        ))
        print(f"wrote {path.relative_to(ROOT.parent)}")
    print(f"{len(MODULE_BUILDERS)} environment modules")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
