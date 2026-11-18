#!/usr/bin/env python3
"""
Finish 4.0 Phase 24 — a11y depth 3 + i18n growth catalog lock helper.

Usage:
  python3 shared/tools/author_a11y_i18n_4.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A11Y_SHIP = ROOT / "ship" / "a11y-depth-3.json"
I18N_SHIP = ROOT / "ship" / "i18n-growth-4.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
MARKER = "authored-finish-4.0-phase-24"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not A11Y_SHIP.is_file() or not I18N_SHIP.is_file():
        raise SystemExit("missing a11y-depth-3 / i18n-growth-4 catalogs")

    listing = load(LISTING)
    listing["a11yDepth3Phase"] = 24
    listing["a11yDepth3Catalog"] = "shared/ship/a11y-depth-3.json"
    listing["i18nGrowth4Phase"] = 24
    listing["i18nGrowth4Catalog"] = "shared/ship/i18n-growth-4.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["a11yDepth3"] = "shared/ship/a11y-depth-3.json"
    pin["i18nGrowth4"] = "shared/ship/i18n-growth-4.json"
    fixtures = list(pin.get("fixtures") or [])
    for fx in ("parity-a11y-depth-3.json", "parity-i18n-growth-4.json"):
        if fx not in fixtures:
            fixtures.append(fx)
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["a11yDepth3Screens"] = 5
    quotas["a11yDepth3ContrastPairs"] = 2
    quotas["i18nUiKeysGrowth4"] = 280
    dod["a11yDepth3"] = {
        "phase": 24,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "a11yDepth3Marker": MARKER,
        "catalog": "shared/ship/a11y-depth-3.json",
        "parityFixture": "shared/fixtures/parity-a11y-depth-3.json",
        "validateScript": "npm run a11yi18n4:validate",
        "checklist": [
            "≥5 depth-3 screen surfaces",
            "≥2 light-theme contrast pairs",
            "≥2 live regions",
            "a11yi18n4:validate green in CI",
        ],
    }
    dod["i18nGrowth4"] = {
        "phase": 24,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "i18nGrowth4Marker": MARKER,
        "catalog": "shared/ship/i18n-growth-4.json",
        "parityFixture": "shared/fixtures/parity-i18n-growth-4.json",
        "validateScript": "npm run a11yi18n4:validate",
        "checklist": [
            "≥280 UI keys en/es/pt",
            "≥20 a11y.* keys",
            'Android Text(" literals = 0',
            "a11yi18n4:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase24 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 24), None)
    if not phase24 or phase24.get("validate") != "a11yi18n4:validate":
        raise SystemExit("kickoff phase 24 must validate via a11yi18n4:validate")
    kickoff.setdefault("baseline", {})["i18nUiKeys"] = 280
    dump(KICKOFF, kickoff)
    print("OK author_a11y_i18n_4 — listing/pin/DoD/kickoff wired")


if __name__ == "__main__":
    main()
