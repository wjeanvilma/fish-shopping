#!/usr/bin/env python3
"""Finish 2.0 Phase 27 — thin wrapper around the TypeScript content scaffold CLI.

Prefer: cd web && npm run content:scaffold -- <kind> --id <slug> [...]
This script forwards argv to that npm entry so shared/tools stays discoverable.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    web = root / "web"
    cmd = ["npm", "run", "content:scaffold", "--", *sys.argv[1:]]
    return subprocess.call(cmd, cwd=web)


if __name__ == "__main__":
    raise SystemExit(main())
