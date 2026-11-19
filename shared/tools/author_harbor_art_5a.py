#!/usr/bin/env python3
"""
Finish 5.0 Phase 7 — harbor art 5a catalog lock helper.

Usage:
  python3 shared/tools/author_harbor_art_5a.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "harbor-art-5a.json"
PARITY = ROOT / "fixtures" / "parity-harbor-art-5a.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-5.0-phase-7"


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
    listing["harborArt5aPhase"] = 7
    listing["harborArt5aCatalog"] = "shared/ship/harbor-art-5a.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["harborArt5a"] = "shared/ship/harbor-art-5a.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-harbor-art-5a.json" not in fixtures:
        fixtures.append("parity-harbor-art-5a.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["harborArt5a"] = {
        "phase": 7,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "harborArt5aMarker": MARKER,
        "catalog": "shared/ship/harbor-art-5a.json",
        "parityFixture": "shared/fixtures/parity-harbor-art-5a.json",
        "validateScript": "npm run harborart5a:validate",
        "checklist": [
            "Pass harbors 1–6 stamped harborFinish5=harbor-art-5a",
            "≥10 HarborArt_* nodes retained with scenic+cozy markers",
            "authoredHarbors stays 10; harborArt5Incomplete open until 5b",
            "harborart5a:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase7 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 7), None)
    if not phase7 or phase7.get("validate") != "harborart5a:validate":
        raise SystemExit("kickoff phase 7 must validate via harborart5a:validate")
    if "harborArt5Incomplete" not in kickoff.get("gaps", {}):
        raise SystemExit("gaps.harborArt5Incomplete key must remain on kickoff")
    print("OK author_harbor_art_5a — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
