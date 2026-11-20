#!/usr/bin/env python3
"""Finish 6.0 Phase 3 — thin wrapper around npm run ship:codegen."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str]) -> int:
    cmd = ["npm", "run", "ship:codegen", "--", *argv]
    return subprocess.call(cmd, cwd=ROOT / "web")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
