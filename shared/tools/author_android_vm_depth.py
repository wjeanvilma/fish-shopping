#!/usr/bin/env python3
"""
Finish 5.0 Phase 4 — Android VM/intent depth catalog lock helper.

Usage:
  python3 shared/tools/author_android_vm_depth.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "android-vm-depth.json"
PARITY = ROOT / "fixtures" / "parity-android-vm-depth.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-5.0-phase-4"


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
    listing["androidVmDepthPhase"] = 4
    listing["androidVmDepthCatalog"] = "shared/ship/android-vm-depth.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["androidVmDepth"] = "shared/ship/android-vm-depth.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-android-vm-depth.json" not in fixtures:
        fixtures.append("parity-android-vm-depth.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["androidVmDepth"] = {
        "phase": 4,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "androidVmDepthMarker": MARKER,
        "catalog": "shared/ship/android-vm-depth.json",
        "parityFixture": "shared/fixtures/parity-android-vm-depth.json",
        "validateScript": "npm run androidvmdepth:validate",
        "checklist": [
            "VmFishingIntents extracted",
            "LoopHudSnapshot covers engine-depth view fields",
            "HUD bindings for cast/spoil/service/contract/quest",
            "androidvmdepth:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase4 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 4), None)
    if not phase4 or phase4.get("validate") != "androidvmdepth:validate":
        raise SystemExit("kickoff phase 4 must validate via androidvmdepth:validate")
    print("OK author_android_vm_depth — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
