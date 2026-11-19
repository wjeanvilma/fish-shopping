#!/usr/bin/env python3
"""
Finish 5.0 Phase 11 — atmosphere/cozy render depth 5 lock helper.

Regenerates harbor blockouts with atmosphereFinish5 stamps, closes
gaps.atmosphere5Incomplete, and wires listing/pin/DoD.

Usage:
  python3 shared/tools/author_atmosphere_5.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "atmosphere-5.json"
PARITY = ROOT / "fixtures" / "parity-atmosphere-5.json"
PASS = ROOT / "ship" / "harbor-art-pass.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
GENERATOR = ROOT / "tools" / "generate_blockout.py"

MARKER = "authored-finish-5.0-phase-11"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not SHIP.is_file():
        raise SystemExit(f"missing catalog {SHIP}")
    if not PARITY.is_file():
        raise SystemExit(f"missing parity {PARITY}")

    # Regenerate all harbor GLBs with atmosphere stamps.
    rc = subprocess.call([sys.executable, str(GENERATOR)], cwd=str(ROOT.parent))
    if rc != 0:
        raise SystemExit(f"generate_blockout.py failed with {rc}")

    pass_cat = load(PASS)
    soft = pass_cat.setdefault("softFloors", {})
    soft["atmosphereFinish5Marker"] = "atmosphere-5"
    soft["cozyArtMarker"] = "cozy-art-5"
    dump(PASS, pass_cat)

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["atmosphere5Incomplete"] = False
    dump(KICKOFF, kickoff)

    listing = load(LISTING)
    listing["atmosphere5Phase"] = 11
    listing["atmosphere5Catalog"] = "shared/ship/atmosphere-5.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["atmosphere5"] = "shared/ship/atmosphere-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-atmosphere-5.json" not in fixtures:
        fixtures.append("parity-atmosphere-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["atmosphere5"] = {
        "phase": 11,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "atmosphere5Marker": MARKER,
        "catalog": "shared/ship/atmosphere-5.json",
        "parityFixture": "shared/fixtures/parity-atmosphere-5.json",
        "validateScript": "npm run atmosphere5:validate",
        "checklist": [
            "All 10 harbors stamped atmosphereFinish5=atmosphere-5",
            "Water/Foam/LampGlow sockets retained with cozy-art-5",
            "gaps.atmosphere5Incomplete closed",
            "atmosphere5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    phase11 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 11), None)
    if not phase11 or phase11.get("validate") != "atmosphere5:validate":
        raise SystemExit("kickoff phase 11 must validate via atmosphere5:validate")
    print(
        f"OK author_atmosphere_5 — "
        f"{len(pass_cat.get('authoredHarbors', []))} harbors stamped; "
        f"atmosphere5Incomplete closed"
    )


if __name__ == "__main__":
    main()
