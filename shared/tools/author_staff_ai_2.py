#!/usr/bin/env python3
"""
Finish 4.0 Phase 19 — staff/worker AI depth wave 2 catalog lock helper.

Usage:
  python3 shared/tools/author_staff_ai_2.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "staff-ai-2.json"
PARITY = ROOT / "fixtures" / "parity-staff-ai-2.json"
WAVE1 = ROOT / "ship" / "worker-ai-depth.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-4.0-phase-19"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def soft_floor_worker_ai() -> None:
    wave1 = load(WAVE1)
    wave1["kotlinWorkersPath"] = (
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt"
    )
    gates = list(wave1.get("preflightGates") or [])
    old = "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/Workers.kt"
    new = "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt"
    gates = [new if g == old else g for g in gates]
    if new not in gates:
        gates.append(new)
    wave1["preflightGates"] = gates
    dump(WAVE1, wave1)


def wire_listing_pin_dod() -> None:
    listing = load(LISTING)
    listing["staffAi2Phase"] = 19
    listing["staffAi2Catalog"] = "shared/ship/staff-ai-2.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["staffAi2"] = "shared/ship/staff-ai-2.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-staff-ai-2.json" not in fixtures:
        fixtures.append("parity-staff-ai-2.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["staffAi2"] = {
        "phase": 19,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "staffAi2Marker": MARKER,
        "catalog": "shared/ship/staff-ai-2.json",
        "parityFixture": "shared/fixtures/parity-staff-ai-2.json",
        "validateScript": "npm run staffai2:validate",
        "checklist": [
            "Fisher trophy_cast / line_pro depth",
            "Porter dock_relay / cargo_sprint depth",
            "Cashier quick_till queue depth",
            "Soft-floor workerai:validate → WorkerAi.kt",
            "staffai2:validate green in CI",
        ],
    }
    dump(DOD, dod)


def main() -> None:
    if not SHIP.is_file():
        raise SystemExit(f"missing catalog {SHIP}")
    if not PARITY.is_file():
        raise SystemExit(f"missing parity {PARITY}")
    soft_floor_worker_ai()
    wire_listing_pin_dod()
    kickoff = load(KICKOFF)
    phase19 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 19), None)
    if not phase19 or phase19.get("validate") != "staffai2:validate":
        raise SystemExit("kickoff phase 19 must validate via staffai2:validate")
    print("OK author_staff_ai_2 — soft-floor worker AI + listing/pin/DoD wired")


if __name__ == "__main__":
    main()
