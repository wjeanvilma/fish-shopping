#!/usr/bin/env python3
"""
Finish 4.0 Phase 22 — Web↔Android panel feature parity depth catalog lock helper.

Usage:
  python3 shared/tools/author_ui_parity_depth.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "ui-parity-depth.json"
PARITY = ROOT / "fixtures" / "parity-ui-parity-depth.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-4.0-phase-22"


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
    listing["uiParityPhase"] = 22
    listing["uiParityCatalog"] = "shared/ship/ui-parity-depth.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["uiParity"] = "shared/ship/ui-parity-depth.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-ui-parity-depth.json" not in fixtures:
        fixtures.append("parity-ui-parity-depth.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["uiParity"] = {
        "phase": 22,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "uiParityMarker": MARKER,
        "catalog": "shared/ship/ui-parity-depth.json",
        "parityFixture": "shared/fixtures/parity-ui-parity-depth.json",
        "validateScript": "npm run uiparity:validate",
        "checklist": [
            "≥12 paired panel paths",
            "≥13 feature marker floors",
            "Dashboard loanInterest/loanCollected parity",
            "Goals loan term + Reward label",
            "Staff trainReason web+Android",
            "uiparity:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase22 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 22), None)
    if not phase22 or phase22.get("validate") != "uiparity:validate":
        raise SystemExit("kickoff phase 22 must validate via uiparity:validate")
    print("OK author_ui_parity_depth — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
