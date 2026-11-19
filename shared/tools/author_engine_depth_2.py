#!/usr/bin/env python3
"""
Finish 5.0 Phase 3 — engine depth 2 catalog lock helper.

Usage:
  python3 shared/tools/author_engine_depth_2.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "engine-depth-2.json"
PARITY = ROOT / "fixtures" / "parity-engine-depth-2.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-5.0-phase-3"


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
    listing["engineDepth2Phase"] = 3
    listing["engineDepth2Catalog"] = "shared/ship/engine-depth-2.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["engineDepth2"] = "shared/ship/engine-depth-2.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-engine-depth-2.json" not in fixtures:
        fixtures.append("parity-engine-depth-2.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["engineDepth2"] = {
        "phase": 3,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "engineDepth2Marker": MARKER,
        "catalog": "shared/ship/engine-depth-2.json",
        "parityFixture": "shared/fixtures/parity-engine-depth-2.json",
        "validateScript": "npm run enginedepth2:validate",
        "checklist": [
            "Service queue + patience pressure",
            "Contract deadline + fail-streak pressure",
            "Next quest progress",
            "Coaching tips for rush/queue/deadline/quest",
            "enginedepth2:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase3 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 3), None)
    if not phase3 or phase3.get("validate") != "enginedepth2:validate":
        raise SystemExit("kickoff phase 3 must validate via enginedepth2:validate")
    print("OK author_engine_depth_2 — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
