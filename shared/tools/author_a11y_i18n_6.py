#!/usr/bin/env python3
"""
Finish 6.0 Phase 22 — a11y depth 5 + i18n key growth (≥400).

Catalogs are already authored; re-run only if regenerating from this session's
inline author logic. Prefer shared/ship/a11y-depth-5.json + i18n-growth-6.json.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    a11y = ROOT / "ship" / "a11y-depth-5.json"
    i18n = ROOT / "ship" / "i18n-growth-6.json"
    depth = ROOT / "a11y" / "accessibility-depth-5.json"
    if not (a11y.is_file() and i18n.is_file() and depth.is_file()):
        raise SystemExit("Phase 22 catalogs missing — regenerate from agent author session")
    print("OK author_a11y_i18n_6 — a11y-depth-5 + i18n-growth-6 present")


if __name__ == "__main__":
    main()
