#!/usr/bin/env python3
"""
Finish 4.0 Phase 21 — offline/cloud/analytics hardening catalog lock helper.

Usage:
  python3 shared/tools/author_offline_cloud_2.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "offline-cloud-2.json"
PARITY = ROOT / "fixtures" / "parity-offline-cloud-2.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-4.0-phase-21"


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
    listing["offlineCloud2Phase"] = 21
    listing["offlineCloud2Catalog"] = "shared/ship/offline-cloud-2.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["offlineCloud2"] = "shared/ship/offline-cloud-2.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-offline-cloud-2.json" not in fixtures:
        fixtures.append("parity-offline-cloud-2.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["offlineCloud2"] = {
        "phase": 21,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "offlineCloud2Marker": MARKER,
        "catalog": "shared/ship/offline-cloud-2.json",
        "parityFixture": "shared/fixtures/parity-offline-cloud-2.json",
        "validateScript": "npm run offlinecloud2:validate",
        "checklist": [
            "≥10 daily objectives / boardSlots ≥4",
            "Offline journal delta fields",
            "Cloud conflict reasonCode + diffHints",
            "Analytics requeue/retry",
            "offlinecloud2:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase21 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 21), None)
    if not phase21 or phase21.get("validate") != "offlinecloud2:validate":
        raise SystemExit("kickoff phase 21 must validate via offlinecloud2:validate")
    print("OK author_offline_cloud_2 — listing/pin/DoD wired")


if __name__ == "__main__":
    main()
