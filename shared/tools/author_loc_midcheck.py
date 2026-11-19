#!/usr/bin/env python3
"""
Finish 5.0 Phase 6 — LOC mid-check catalog lock helper.

Usage:
  python3 shared/tools/author_loc_midcheck.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "loc-midcheck.json"
PARITY = ROOT / "fixtures" / "parity-loc-midcheck.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-5.0-phase-6"


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
    listing["locMidcheckPhase"] = 6
    listing["locMidcheckCatalog"] = "shared/ship/loc-midcheck.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["locMidcheck"] = "shared/ship/loc-midcheck.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-loc-midcheck.json" not in fixtures:
        fixtures.append("parity-loc-midcheck.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["locMidcheck"] = {
        "phase": 6,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "locMidcheckMarker": MARKER,
        "catalog": "shared/ship/loc-midcheck.json",
        "parityFixture": "shared/fixtures/parity-loc-midcheck.json",
        "validateScript": "npm run locmidcheck:validate",
        "smokeScript": "npm run locmidcheck:smoke",
        "checklist": [
            "Midcheck LOC locked after Phases 2–5",
            "Interim soft floors + Phase 1 baseline anti-regression",
            "Plan targets 38k/26k/56k/120k unchanged",
            "locmidcheck:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase6 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 6), None)
    if not phase6 or phase6.get("validate") != "locmidcheck:validate":
        raise SystemExit("kickoff phase 6 must validate via locmidcheck:validate")
    print("OK author_loc_midcheck — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
