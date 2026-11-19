#!/usr/bin/env python3
"""
Finish 5.0 Phase 2 — engine depth 1 catalog lock helper.

Usage:
  python3 shared/tools/author_engine_depth_1.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "engine-depth-1.json"
PARITY = ROOT / "fixtures" / "parity-engine-depth-1.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-5.0-phase-2"


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
    listing["engineDepth1Phase"] = 2
    listing["engineDepth1Catalog"] = "shared/ship/engine-depth-1.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["engineDepth1"] = "shared/ship/engine-depth-1.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-engine-depth-1.json" not in fixtures:
        fixtures.append("parity-engine-depth-1.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["engineDepth1"] = {
        "phase": 2,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "engineDepth1Marker": MARKER,
        "catalog": "shared/ship/engine-depth-1.json",
        "parityFixture": "shared/fixtures/parity-engine-depth-1.json",
        "validateScript": "npm run enginedepth1:validate",
        "checklist": [
            "Cast FSM waiting→strike→fight",
            "Strike mastery XP mult",
            "Bag spoil pressure + ETA",
            "engineDepthIncomplete closed",
            "enginedepth1:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["engineDepthIncomplete"] = False
    dump(KICKOFF, kickoff)

    phase2 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 2), None)
    if not phase2 or phase2.get("validate") != "enginedepth1:validate":
        raise SystemExit("kickoff phase 2 must validate via enginedepth1:validate")
    print("OK author_engine_depth_1 — listing/pin/DoD/kickoff gap wired")


if __name__ == "__main__":
    main()
