#!/usr/bin/env python3
"""Finish 6.0 Phase 24 — author Compose E2E ≥20 nest tag catalog stubs."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCENARIO_FLOOR = 20
TAG_FLOOR = 40
NEST_TAGS = [
    "nest.treasury",
    "nest.loans",
    "bag.panel",
    "dash.root",
    "contracts.panel",
    "map.panel",
    "species.book",
    "staff.train",
]


def main() -> None:
    compose = json.loads((ROOT / "shared/ship/compose-ui-tests.json").read_text())
    tags = (ROOT / "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt").read_text()
    scenarios = compose.get("scenarios") or []
    nest = sum(1 for t in NEST_TAGS if f'"{t}"' in tags)
    print(f"compose-e2e-6 author check: scenarios={len(scenarios)} nestTags={nest}")
    if len(scenarios) < SCENARIO_FLOOR:
        raise SystemExit(f"scenarios {len(scenarios)} < {SCENARIO_FLOOR}")
    if nest < len(NEST_TAGS):
        raise SystemExit("missing nest ComposeUiTags")


if __name__ == "__main__":
    main()
