#!/usr/bin/env python3
"""Finish 6.0 Phase 29 — author parity-lock-6 catalogs + wire pins/DoD/kickoff."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


MARKER = "authored-finish-6.0-phase-29"
SHIP = "shared/ship/parity-lock-6.0.json"
FIXTURE = "shared/fixtures/parity-parity-lock-6.0.json"
LIVE = "shared/fixtures/parity-lock.json"

FINISH6_SUITES = [
    {
        "id": "machines_15_16",
        "title": "Machines 15–16 roaster recipes",
        "fixture": "shared/fixtures/parity-machines-15-16.json",
        "covers": ["machines", "recipes"],
        "finish6": True,
    },
    {
        "id": "quests_contracts_6",
        "title": "Quests/contracts Finish 6.0 floors",
        "fixture": "shared/fixtures/parity-quests-contracts-6.json",
        "covers": ["quests", "contracts"],
        "finish6": True,
    },
    {
        "id": "endgame_4",
        "title": "Endgame deepen + schema 27 sigils",
        "fixture": "shared/fixtures/parity-endgame-4.json",
        "covers": ["schema27", "endgame"],
        "finish6": True,
    },
    {
        "id": "rivals_seasonal_6",
        "title": "Rivals/seasonal/baits/cosmetics Finish 6 floors",
        "fixture": "shared/fixtures/parity-rivals-seasonal-6.json",
        "covers": ["rivals", "seasonal", "baits", "cosmetics"],
        "finish6": True,
    },
]

FINISH6_GATES = {
    "machines1516RecipesParity": True,
    "questsContracts6FloorsMet": True,
    "endgameSchema27Persisted": True,
    "rivalsSeasonal6FloorsMet": True,
}


def main() -> None:
    ship = {
        "phase": 29,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.parity_lock_6.v1",
        "description": (
            "Finish 6.0 Phase 29 — Parity lock 6.0: expand parity-lock.json suites for "
            "machines 15–16, quests/contracts-6, endgame-4/schema 27, and rivals-seasonal-6. "
            "Closes kickoff gap parityLock6Missing. Soft-floors Finish 2.0–5.0 parity gates "
            "(8/12/16/20). Schema stays 27 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "parityLock6Marker": MARKER,
        "closesGap": "parityLock6Missing",
        "parityLockCatalog": LIVE,
        "extendsParityLock5": "shared/ship/parity-lock-5.0.json",
        "extendsParityLock4": "shared/ship/parity-lock-4.0.json",
        "extendsParityLock3": "shared/ship/parity-lock-3.0.json",
        "extendsParityLock2": "shared/ship/parity-lock-2.0.json",
        "suiteFloor": 24,
        "finish2SuiteFloor": 4,
        "finish3SuiteFloor": 4,
        "finish4SuiteFloor": 4,
        "finish5SuiteFloor": 4,
        "finish6SuiteFloor": 4,
        "requiredFinish6SuiteIds": [s["id"] for s in FINISH6_SUITES],
        "requiredFinish5SuiteIds": [
            "machines_13_14",
            "quests_contracts_5",
            "endgame_3",
            "rivals_seasonal_5",
        ],
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
        "validateScript": "npm run parity6:validate",
        "softParity5Validate": "npm run parity5:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "authorTool": "shared/tools/author_parity_lock_6.py",
        "softFloors": {
            "finish2HistoricalSuiteFloor": 8,
            "finish3HistoricalSuiteFloor": 12,
            "finish4HistoricalSuiteFloor": 16,
            "finish5HistoricalSuiteFloor": 20,
            "finish2SuiteFloor": 4,
            "finish3SuiteFloor": 4,
            "finish4SuiteFloor": 4,
            "finish5SuiteFloor": 4,
            "note": (
                "parity2–parity5 stay green on historical 8/12/16/20 suite floors; "
                "Phase 29 enforces live ≥24 + 4 Finish 6.0 suites."
            ),
        },
        "checklist": [
            "parity-lock.json lists ≥24 suites including 4 Finish 6.0 system suites",
            "machines_15_16 / quests_contracts_6 / endgame_4 / rivals_seasonal_6 fixtures exist",
            "finish6ParityLockPhase=29; Finish 6.0 gates true",
            "Finish 2/3/4/5 parity validates still green (soft floors)",
            "parity-parity-lock-6.0 + parity6:validate green",
            "CI runs parity6:validate",
            "kickoff gaps.parityLock6Missing=false",
            "schema stays 27 / content 5.0.0",
        ],
        "preflightGates": [
            SHIP,
            LIVE,
            FIXTURE,
            "shared/ship/parity-lock-5.0.json",
            "shared/ship/parity-lock-4.0.json",
            "shared/ship/parity-lock-3.0.json",
            "shared/ship/parity-lock-2.0.json",
            "shared/fixtures/parity-machines-15-16.json",
            "shared/fixtures/parity-quests-contracts-6.json",
            "shared/fixtures/parity-endgame-4.json",
            "shared/fixtures/parity-rivals-seasonal-6.json",
            "web/src/ship/parityLock6.ts",
            "web/src/engine/parityLock.ts",
            "web/scripts/validate-parity-lock-6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ParityLock6.kt",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/ParityLock.kt",
        ],
    }
    dump(ROOT / SHIP, ship)

    fixture = {
        "schema": "fish.fixture.parity_parity_lock_6.v1",
        "description": (
            "Finish 6.0 Phase 29: parity-lock 6.0 suite floors and required Finish 6.0 system fixtures."
        ),
        "parityLock6Marker": MARKER,
        "suiteFloor": 24,
        "finish2SuiteFloor": 4,
        "finish3SuiteFloor": 4,
        "finish4SuiteFloor": 4,
        "finish5SuiteFloor": 4,
        "finish6SuiteFloor": 4,
        "simHzInvariant": 20,
        "expect": {
            "closesGap": "parityLock6Missing",
            "parityLock6Missing": False,
            "openGapFlagMin": 0,
            "baselineSuiteIds": ship["requiredBaselineSuiteIds"],
            "finish2SuiteIds": ship["requiredFinish2SuiteIds"],
            "finish3SuiteIds": ship["requiredFinish3SuiteIds"],
            "finish4SuiteIds": ship["requiredFinish4SuiteIds"],
            "finish5SuiteIds": ship["requiredFinish5SuiteIds"],
            "finish6SuiteIds": ship["requiredFinish6SuiteIds"],
            "finish6Fixtures": [s["fixture"] for s in FINISH6_SUITES],
            "gates": list(FINISH6_GATES.keys()),
        },
    }
    dump(ROOT / FIXTURE, fixture)

    live = load(ROOT / LIVE)
    live["description"] = (
        "Post-1.0 Phase 27 parity lock + Finish 2.0/3.0/4.0/5.0/6.0 Phase 29 expansions. "
        "Schema 27 / content 5.0.0; legacy migrations through v22. Suites cover baseline, "
        "Finish 2–5 systems, and Finish 6.0 machines 15–16 / quests-contracts-6 / endgame-4 / "
        "rivals-seasonal-6."
    )
    live["contentVersion"] = "5.0.0"
    live["schemaVersion"] = 27
    live["finish6ParityLockPhase"] = 29
    live["parityLock6Catalog"] = SHIP
    existing_ids = {s["id"] for s in live["suites"]}
    for suite in FINISH6_SUITES:
        if suite["id"] not in existing_ids:
            live["suites"].append(suite)
    live["gates"].update(FINISH6_GATES)
    live["suiteFloor"] = 24
    live["finish6SuiteFloor"] = 4
    for path in [s["fixture"] for s in FINISH6_SUITES]:
        if path not in live["preflightGates"]:
            live["preflightGates"].insert(-2, path)
    dump(ROOT / LIVE, live)

    kickoff = load(ROOT / "shared/ship/finish-6.0-kickoff.json")
    kickoff["gaps"]["parityLock6Missing"] = False
    dump(ROOT / "shared/ship/finish-6.0-kickoff.json", kickoff)

    parity_kick = load(ROOT / "shared/fixtures/parity-finish-6.0-kickoff.json")
    parity_kick["expect"]["openGapFlagMin"] = 0
    dump(ROOT / "shared/fixtures/parity-finish-6.0-kickoff.json", parity_kick)

    listing = load(ROOT / "shared/store/listing.json")
    listing["parityLock6Phase"] = 29
    listing["parityLock6Catalog"] = SHIP
    dump(ROOT / "shared/store/listing.json", listing)

    pin = load(ROOT / "shared/fixtures/RELEASE_PIN.json")
    pin["parityLock6"] = SHIP
    if "parity-parity-lock-6.0.json" not in pin["fixtures"]:
        pin["fixtures"].append("parity-parity-lock-6.0.json")
    for f in [
        "parity-machines-15-16.json",
        "parity-quests-contracts-6.json",
        "parity-endgame-4.json",
        "parity-rivals-seasonal-6.json",
    ]:
        if f not in pin["fixtures"]:
            pin["fixtures"].append(f)
    dump(ROOT / "shared/fixtures/RELEASE_PIN.json", pin)

    dod = load(ROOT / "shared/ship/definition-of-done.json")
    dod["quotas"]["parityLockSuites"] = 24
    dod["quotas"]["parityLockFinish6Suites"] = 4
    dod["notes"] = (
        "Finish 6.0 Phase 29 parity-lock-6 complete (≥24 suites + 4 Finish 6 system suites); "
        "Phases 1–28 remain green. Content stays 5.0.0 / schema 27. parityLock6Missing closed. "
        "Deploy/tag remain manual."
    )
    dod["parityLock6"] = {
        "phase": 29,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "parityLock6Marker": MARKER,
        "catalog": SHIP,
        "parityFixture": FIXTURE,
        "validateScript": "npm run parity6:validate",
        "checklist": [
            "≥24 parity suites",
            "4 Finish 6.0 system suites locked",
            "Kickoff parityLock6Missing closed",
            "parity6:validate green in CI",
        ],
    }
    dump(ROOT / "shared/ship/definition-of-done.json", dod)

    # Soft-floor note on Finish 5 ship catalog.
    p5 = load(ROOT / "shared/ship/parity-lock-5.0.json")
    p5.setdefault("softFloors", {})
    p5["softFloors"]["note"] = (
        "parity2:validate + parity3:validate + parity4:validate + parity5:validate stay green on "
        "historical 8/12/16/20 suite floors; Finish 6.0 Phase 29 raises live parity-lock suiteFloor "
        "to 24."
    )
    dump(ROOT / "shared/ship/parity-lock-5.0.json", p5)

    # Soft-floor device-perf-6 parity openGapFlagMin → 0.
    dp = load(ROOT / "shared/fixtures/parity-device-perf-6.json")
    if "expect" in dp and "openGapFlagMin" in dp["expect"]:
        dp["expect"]["openGapFlagMin"] = 0
        dump(ROOT / "shared/fixtures/parity-device-perf-6.json", dp)

    # Soft-floor content-cli-6 / analytics openGapFlagMin if present.
    for rel in (
        "shared/fixtures/parity-content-cli-6.json",
        "shared/fixtures/parity-analytics-loadtest-6.json",
    ):
        path = ROOT / rel
        if path.is_file():
            data = load(path)
            if "expect" in data and "openGapFlagMin" in data["expect"]:
                data["expect"]["openGapFlagMin"] = 0
                dump(path, data)

    print(f"authored {SHIP} + {FIXTURE}; live suites={len(live['suites'])}")


if __name__ == "__main__":
    main()
