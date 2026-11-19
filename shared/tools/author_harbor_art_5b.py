#!/usr/bin/env python3
"""
Finish 5.0 Phase 8 — harbor art 5b catalog lock helper.

Usage:
  python3 shared/tools/author_harbor_art_5b.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "harbor-art-5b.json"
PARITY = ROOT / "fixtures" / "parity-harbor-art-5b.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-5.0-phase-8"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not SHIP.is_file():
        raise SystemExit(f"missing catalog {SHIP}")
    if not PARITY.is_file():
        raise SystemExit(f"missing parity {PARITY}")

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["harborArt5Incomplete"] = False
    dump(KICKOFF, kickoff)

    listing = load(LISTING)
    listing["harborArt5bPhase"] = 8
    listing["harborArt5bCatalog"] = "shared/ship/harbor-art-5b.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["harborArt5b"] = "shared/ship/harbor-art-5b.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-harbor-art-5b.json" not in fixtures:
        fixtures.append("parity-harbor-art-5b.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["harborArt5b"] = {
        "phase": 8,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "harborArt5bMarker": MARKER,
        "catalog": "shared/ship/harbor-art-5b.json",
        "parityFixture": "shared/fixtures/parity-harbor-art-5b.json",
        "validateScript": "npm run harborart5b:validate",
        "checklist": [
            "Pass harbors 7–10 stamped harborFinish5=harbor-art-5b",
            "gaps.harborArt5Incomplete closed",
            "authoredHarbors stays 10 until Phase 14",
            "harborart5b:validate green in CI",
        ],
    }
    dump(DOD, dod)

    phase8 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 8), None)
    if not phase8 or phase8.get("validate") != "harborart5b:validate":
        raise SystemExit("kickoff phase 8 must validate via harborart5b:validate")
    print("OK author_harbor_art_5b — listing/pin/DoD + gap closed")


if __name__ == "__main__":
    main()
