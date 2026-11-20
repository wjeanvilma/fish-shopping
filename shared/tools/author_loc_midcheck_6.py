#!/usr/bin/env python3
"""
Finish 6.0 Phase 6 — LOC mid-check catalog lock helper.

Usage:
  python3 shared/tools/author_loc_midcheck_6.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "loc-midcheck-6.json"
PARITY = ROOT / "fixtures" / "parity-loc-midcheck-6.json"
KICKOFF = ROOT / "ship" / "finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-6.0-phase-6"


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
    listing["locMidcheck6Phase"] = 6
    listing["locMidcheck6Catalog"] = "shared/ship/loc-midcheck-6.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["locMidcheck6"] = "shared/ship/loc-midcheck-6.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-loc-midcheck-6.json" not in fixtures:
        fixtures.append("parity-loc-midcheck-6.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["locMidcheck6"] = {
        "phase": 6,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "locMidcheck6Marker": MARKER,
        "catalog": "shared/ship/loc-midcheck-6.json",
        "parityFixture": "shared/fixtures/parity-loc-midcheck-6.json",
        "validateScript": "npm run locmidcheck6:validate",
        "smokeScript": "npm run locmidcheck6:smoke",
        "checklist": [
            "Midcheck LOC locked after Finish 6 Phases 2–5",
            "Interim soft floors + Phase 1 baseline anti-regression",
            "Plan targets 38k/26k/56k/120k unchanged",
            "locmidcheck6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase6 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 6), None)
    if not phase6 or phase6.get("validate") != "locmidcheck6:validate":
        raise SystemExit("kickoff phase 6 must validate via locmidcheck6:validate")
    if phase6.get("id") != "loc-midcheck-6":
        raise SystemExit("kickoff phase 6 id must be loc-midcheck-6")
    print("OK author_loc_midcheck_6 — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
