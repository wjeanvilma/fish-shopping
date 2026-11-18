#!/usr/bin/env python3
"""
Finish 4.0 Phase 20 — economy/bank/dashboard depth catalog lock helper.

Usage:
  python3 shared/tools/author_economy_2.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "economy-bank-2.json"
PARITY = ROOT / "fixtures" / "parity-economy-bank-2.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-4.0-phase-20"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not SHIP.is_file():
        raise SystemExit(f"missing catalog {SHIP}")
    if not PARITY.is_file():
        raise SystemExit(f"missing parity {PARITY}")

    listing = load(LISTING)
    listing["economy2Phase"] = 20
    listing["economy2Catalog"] = "shared/ship/economy-bank-2.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["economy2"] = "shared/ship/economy-bank-2.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-economy-bank-2.json" not in fixtures:
        fixtures.append("parity-economy-bank-2.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["economy2"] = {
        "phase": 20,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "economy2Marker": MARKER,
        "catalog": "shared/ship/economy-bank-2.json",
        "parityFixture": "shared/fixtures/parity-economy-bank-2.json",
        "validateScript": "npm run economy2:validate",
        "checklist": [
            "≥3 loan products",
            "≥8 coin goal presets",
            "Scarcity + reputation retune",
            "Dashboard cashflow surfaces",
            "economy2:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase20 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 20), None)
    if not phase20 or phase20.get("validate") != "economy2:validate":
        raise SystemExit("kickoff phase 20 must validate via economy2:validate")
    print("OK author_economy_2 — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
