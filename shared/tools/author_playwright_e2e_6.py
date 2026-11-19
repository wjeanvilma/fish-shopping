#!/usr/bin/env python3
"""Finish 6.0 Phase 23 — author Playwright E2E ≥24 nest deep-link catalog stubs."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCENARIO_FLOOR = 24
ID_FLOOR = 40
NEST_ALIASES = [
    "nesttreasury",
    "nestloans",
    "nestember",
    "nestconflict",
    "saffron",
    "roastnest",
    "nestjournal",
    "ember",
]


def main() -> None:
    web = json.loads((ROOT / "shared/ship/web-e2e.json").read_text())
    routes = json.loads((ROOT / "shared/deep-links/routes.json").read_text())
    ship = {
        "phase": 23,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.playwright_e2e_6.v1",
        "playwrightE2e6Marker": "authored-finish-6.0-phase-23",
        "closesGap": "e2eDepthThin",
        "scenarioFloor": SCENARIO_FLOOR,
        "idCountFloor": ID_FLOOR,
        "nestAliasMin": len(NEST_ALIASES),
        "nestAliases": NEST_ALIASES,
        "measured": {
            "scenarios": len(web.get("scenarios", [])),
            "nestAliases": sum(1 for a in NEST_ALIASES if a in (routes.get("panelAliases") or {})),
        },
    }
    print(
        f"playwright-e2e-6 author check: scenarios={ship['measured']['scenarios']} "
        f"nestAliases={ship['measured']['nestAliases']}"
    )
    if ship["measured"]["scenarios"] < SCENARIO_FLOOR:
        raise SystemExit(f"scenarios {ship['measured']['scenarios']} < {SCENARIO_FLOOR}")
    if ship["measured"]["nestAliases"] < len(NEST_ALIASES):
        raise SystemExit("missing nest panel aliases")


if __name__ == "__main__":
    main()
