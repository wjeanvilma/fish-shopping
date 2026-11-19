#!/usr/bin/env python3
"""
Finish 5.0 Phase 5 — GameHost + presenter/HUD depth catalog lock helper.

Usage:
  python3 shared/tools/author_host_presenter_depth.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "host-presenter-depth.json"
PARITY = ROOT / "fixtures" / "parity-host-presenter-depth.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-5.0-phase-5"


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
    listing["hostPresenterDepthPhase"] = 5
    listing["hostPresenterDepthCatalog"] = "shared/ship/host-presenter-depth.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["hostPresenterDepth"] = "shared/ship/host-presenter-depth.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-host-presenter-depth.json" not in fixtures:
        fixtures.append("parity-host-presenter-depth.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["hostPresenterDepth"] = {
        "phase": 5,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "hostPresenterDepthMarker": MARKER,
        "catalog": "shared/ship/host-presenter-depth.json",
        "parityFixture": "shared/fixtures/parity-host-presenter-depth.json",
        "validateScript": "npm run hostpresenterdepth:validate",
        "checklist": [
            "HostFishingIntents extracted",
            "loopHudSnapshot covers engine-depth view fields",
            "Web HUD bindings for cast/spoil/service/contract/quest",
            "hostpresenterdepth:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase5 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 5), None)
    if not phase5 or phase5.get("validate") != "hostpresenterdepth:validate":
        raise SystemExit("kickoff phase 5 must validate via hostpresenterdepth:validate")
    print("OK author_host_presenter_depth — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
