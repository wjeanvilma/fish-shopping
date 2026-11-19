#!/usr/bin/env python3
"""Finish 5.0 Phase 29 — author parity-lock-5 catalogs + wire pins/DoD/kickoff."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


MARKER = "authored-finish-5.0-phase-29"
SHIP = "shared/ship/parity-lock-5.0.json"
FIXTURE = "shared/fixtures/parity-parity-lock-5.0.json"
LIVE = "shared/fixtures/parity-lock.json"

FINISH5_SUITES = [
    {
        "id": "machines_13_14",
        "title": "Machines 13–14 poacher recipes",
        "fixture": "shared/fixtures/parity-machines-13-14.json",
        "covers": ["machines", "recipes"],
        "finish5": True,
    },
    {
        "id": "quests_contracts_5",
        "title": "Quests/contracts Finish 5.0 floors",
        "fixture": "shared/fixtures/parity-quests-contracts-5.json",
        "covers": ["quests", "contracts"],
        "finish5": True,
    },
    {
        "id": "endgame_3",
        "title": "Endgame deepen + schema 26 crests",
        "fixture": "shared/fixtures/parity-endgame-3.json",
        "covers": ["schema26", "endgame"],
        "finish5": True,
    },
    {
        "id": "rivals_seasonal_5",
        "title": "Rivals/seasonal/baits/cosmetics Finish 5 floors",
        "fixture": "shared/fixtures/parity-rivals-seasonal-5.json",
        "covers": ["rivals", "seasonal", "baits", "cosmetics"],
        "finish5": True,
    },
]

FINISH5_GATES = {
    "machines1314RecipesParity": True,
    "questsContracts5FloorsMet": True,
    "endgameSchema26Persisted": True,
    "rivalsSeasonal5FloorsMet": True,
}


def main() -> None:
    ship = {
        "phase": 29,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.parity_lock_5.v1",
        "description": (
            "Finish 5.0 Phase 29 — Parity lock 5.0: expand parity-lock.json suites for "
            "machines 13–14, quests/contracts-5, endgame-3/schema 26, and rivals-seasonal-5. "
            "Closes kickoff gap parityLock5Missing. Soft-floors Finish 2.0/3.0/4.0 parity gates "
            "(8/12/16). Schema stays 26 / content 4.0.0."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "parityLock5Marker": MARKER,
        "closesGap": "parityLock5Missing",
        "parityLockCatalog": LIVE,
        "extendsParityLock4": "shared/ship/parity-lock-4.0.json",
        "extendsParityLock3": "shared/ship/parity-lock-3.0.json",
        "extendsParityLock2": "shared/ship/parity-lock-2.0.json",
        "suiteFloor": 20,
        "finish2SuiteFloor": 4,
        "finish3SuiteFloor": 4,
        "finish4SuiteFloor": 4,
        "finish5SuiteFloor": 4,
        "requiredFinish5SuiteIds": [s["id"] for s in FINISH5_SUITES],
        "requiredFinish4SuiteIds": [
            "machines_11_12",
            "quests_contracts_4",
            "rival_markets_2",
            "endgame_2",
        ],
        "requiredFinish3SuiteIds": [
            "rival_markets",
            "schema24_endgame",
            "machines_9_10",
            "quests_contracts_3",
        ],
        "requiredFinish2SuiteIds": [
            "achievements",
            "weather_tide",
            "fishing_mastery",
            "festival_weekends",
        ],
        "requiredBaselineSuiteIds": [
            "prng",
            "starter_line",
            "entitlements_unlock",
            "legacy_migrations",
        ],
        "parityFixture": FIXTURE,
        "validateScript": "npm run parity5:validate",
        "softParity4Validate": "npm run parity4:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "authorTool": "shared/tools/author_parity_lock_5.py",
        "softFloors": {
            "finish2HistoricalSuiteFloor": 8,
            "finish3HistoricalSuiteFloor": 12,
            "finish4HistoricalSuiteFloor": 16,
            "finish2SuiteFloor": 4,
            "finish3SuiteFloor": 4,
            "finish4SuiteFloor": 4,
            "note": (
                "parity2/parity3/parity4 stay green on historical 8/12/16 suite floors; "
                "Phase 29 enforces live ≥20 + 4 Finish 5.0 suites."
            ),
        },
        "checklist": [
            "parity-lock.json lists ≥20 suites including 4 Finish 5.0 system suites",
            "machines_13_14 / quests_contracts_5 / endgame_3 / rivals_seasonal_5 fixtures exist",
            "finish5ParityLockPhase=29; Finish 5.0 gates true",
            "Finish 2/3/4 parity validates still green (soft floors)",
            "parity-parity-lock-5.0 + parity5:validate green",
            "CI runs parity5:validate",
            "kickoff gaps.parityLock5Missing=false",
            "schema stays 26 / content 4.0.0",
        ],
        "preflightGates": [
            SHIP,
            LIVE,
            FIXTURE,
            "shared/ship/parity-lock-4.0.json",
            "shared/ship/parity-lock-3.0.json",
            "shared/ship/parity-lock-2.0.json",
            "shared/fixtures/parity-machines-13-14.json",
            "shared/fixtures/parity-quests-contracts-5.json",
            "shared/fixtures/parity-endgame-3.json",
            "shared/fixtures/parity-rivals-seasonal-5.json",
            "web/src/ship/parityLock5.ts",
            "web/src/engine/parityLock.ts",
            "web/scripts/validate-parity-lock-5.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ParityLock5.kt",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/ParityLock.kt",
        ],
    }
    dump(ROOT / SHIP, ship)

    fixture = {
        "schema": "fish.fixture.parity_parity_lock_5.v1",
        "description": "Finish 5.0 Phase 29: parity-lock 5.0 suite floors and required Finish 5.0 system fixtures.",
        "parityLock5Marker": MARKER,
        "suiteFloor": 20,
        "finish2SuiteFloor": 4,
        "finish3SuiteFloor": 4,
        "finish4SuiteFloor": 4,
        "finish5SuiteFloor": 4,
        "simHzInvariant": 20,
        "expect": {
            "closesGap": "parityLock5Missing",
            "parityLock5Missing": False,
            "baselineSuiteIds": ship["requiredBaselineSuiteIds"],
            "finish2SuiteIds": ship["requiredFinish2SuiteIds"],
            "finish3SuiteIds": ship["requiredFinish3SuiteIds"],
            "finish4SuiteIds": ship["requiredFinish4SuiteIds"],
            "finish5SuiteIds": ship["requiredFinish5SuiteIds"],
            "finish5Fixtures": [s["fixture"] for s in FINISH5_SUITES],
            "gates": list(FINISH5_GATES.keys()),
        },
    }
    dump(ROOT / FIXTURE, fixture)

    live = load(ROOT / LIVE)
    live["description"] = (
        "Post-1.0 Phase 27 parity lock + Finish 2.0/3.0/4.0/5.0 Phase 29 expansions. "
        "Schema 26 / content 4.0.0; legacy migrations through v22. Suites cover baseline, "
        "Finish 2–4 systems, and Finish 5.0 machines 13–14 / quests-contracts-5 / endgame-3 / "
        "rivals-seasonal-5."
    )
    live["contentVersion"] = "4.0.0"
    live["schemaVersion"] = 26
    live["finish5ParityLockPhase"] = 29
    live["parityLock5Catalog"] = SHIP
    existing_ids = {s["id"] for s in live["suites"]}
    for suite in FINISH5_SUITES:
        if suite["id"] not in existing_ids:
            live["suites"].append(suite)
    live["gates"].update(FINISH5_GATES)
    live["suiteFloor"] = 20
    live["finish5SuiteFloor"] = 4
    for path in [s["fixture"] for s in FINISH5_SUITES]:
        if path not in live["preflightGates"]:
            live["preflightGates"].insert(-2, path)
    dump(ROOT / LIVE, live)

    kickoff = load(ROOT / "shared/ship/finish-5.0-kickoff.json")
    kickoff["gaps"]["parityLock5Missing"] = False
    dump(ROOT / "shared/ship/finish-5.0-kickoff.json", kickoff)

    listing = load(ROOT / "shared/store/listing.json")
    listing["parityLock5Phase"] = 29
    listing["parityLock5Catalog"] = SHIP
    dump(ROOT / "shared/store/listing.json", listing)

    pin = load(ROOT / "shared/fixtures/RELEASE_PIN.json")
    pin["parityLock5"] = SHIP
    if "parity-parity-lock-5.0.json" not in pin["fixtures"]:
        pin["fixtures"].append("parity-parity-lock-5.0.json")
    dump(ROOT / "shared/fixtures/RELEASE_PIN.json", pin)

    dod = load(ROOT / "shared/ship/definition-of-done.json")
    dod["quotas"]["parityLockSuites"] = 20
    dod["quotas"]["parityLockFinish5Suites"] = 4
    dod["notes"] = (
        "Finish 5.0 Phase 29 parity-lock-5 complete (≥20 suites + 4 Finish 5 system suites); "
        "Phases 1–28 remain green. Content stays 4.0.0 / schema 26. parityLock5Missing closed. "
        "Deploy/tag remain manual."
    )
    dod["parityLock5"] = {
        "phase": 29,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "parityLock5Marker": MARKER,
        "catalog": SHIP,
        "parityFixture": FIXTURE,
        "validateScript": "npm run parity5:validate",
        "checklist": [
            "≥20 parity suites",
            "4 Finish 5.0 system suites locked",
            "Kickoff parityLock5Missing closed",
            "parity5:validate green in CI",
        ],
    }
    dump(ROOT / "shared/ship/definition-of-done.json", dod)

    # Soft-floor note on Finish 4 ship catalog.
    p4 = load(ROOT / "shared/ship/parity-lock-4.0.json")
    p4.setdefault("softFloors", {})
    p4["softFloors"]["note"] = (
        "parity2:validate + parity3:validate + parity4:validate stay green on historical "
        "8/12/16 suite floors; Finish 5.0 Phase 29 raises live parity-lock suiteFloor to 20."
    )
    dump(ROOT / "shared/ship/parity-lock-4.0.json", p4)

    print(f"authored {SHIP} + {FIXTURE}; live suites={len(live['suites'])}")


if __name__ == "__main__":
    main()
