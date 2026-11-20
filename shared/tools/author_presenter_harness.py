#!/usr/bin/env python3
"""
Finish 6.0 Phase 21 — Presenter/render CPU snapshot harness.

Usage:
  python3 shared/tools/author_presenter_harness.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "presenter-harness.json"
PARITY = ROOT / "fixtures" / "parity-presenter-harness.json"
KICKOFF6 = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"

MARKER = "authored-finish-6.0-phase-21"
OPEN_GAP_MIN = 8

STAGES = ["crowd", "fly", "burst", "locomotion", "qualityBind", "nestHud"]
SNAPSHOT_FIELDS = [
    "lastFrameMs",
    "emaFrameMs",
    "targetMs",
    "overBudget",
    "budgetAction",
    "quality",
    "harborCacheLimit",
    "sampleCount",
    "stageMs",
    "caps",
    "nestHudPressurePermille",
]


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_ship() -> None:
    catalog = {
        "phase": 21,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.presenter_harness.v1",
        "description": (
            "Finish 6.0 Phase 21 — Presenter/render CPU snapshot harness. "
            "Dual web↔Android stage timing + nest HUD pressure snapshot wired through HarborScene/HarborRenderer. "
            "Schema stays 27 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "presenterHarnessMarker": MARKER,
        "stageMin": 6,
        "snapshotFieldMin": 11,
        "stages": STAGES,
        "snapshotFields": SNAPSHOT_FIELDS,
        "requiredFiles": [
            "web/src/render/presenterCpuSnapshot.ts",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresenterCpuSnapshot.kt",
        ],
        "requiredSymbols": {
            "presenterCpuSnapshot.ts": [
                "PRESENTER_CPU_STAGES",
                "PresenterCpuHarness",
                "presenterCpuSnapshotFrom",
                "nestHud",
                "nestHudPressurePermille",
            ],
            "PresenterCpuSnapshot.kt": [
                "PresenterCpuHarness",
                "PresenterCpuSnapshots",
                "NEST_HUD",
                "nestHudPressurePermille",
            ],
            "HarborScene.ts": [
                "PresenterCpuHarness",
                "cpuHarness",
                "presenterCpuSnapshot",
                "setNestHudPressurePermille",
            ],
            "HarborRenderer.kt": [
                "PresenterCpuHarness",
                "cpuHarness",
                "presenterCpuSnapshot",
                "setNestHudPressurePermille",
            ],
        },
        "parityFixture": "shared/fixtures/parity-presenter-harness.json",
        "authorTool": "shared/tools/author_presenter_harness.py",
        "validateScript": "npm run presenterharness:validate",
        "softFrameTimingValidate": "npm run perf:budget",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "checklist": [
            "≥6 presenter CPU stages including nestHud",
            "≥11 snapshot fields (frame + stage + caps + nest pressure)",
            "HarborScene + HarborRenderer wire PresenterCpuHarness",
            "kickoff presenterHarnessMissing=false",
            "presenterharness:validate green in CI",
            "schema stays 27 / content 5.0.0",
            "openGapFlagMin 9→8",
        ],
        "preflightGates": [
            "shared/ship/presenter-harness.json",
            "shared/fixtures/parity-presenter-harness.json",
            "shared/tools/author_presenter_harness.py",
            "web/src/render/presenterCpuSnapshot.ts",
            "web/src/render/HarborScene.ts",
            "web/src/render/frameTiming.ts",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresenterCpuSnapshot.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/HarborRenderer.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/FrameTiming.kt",
            "web/src/ship/presenterHarness.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/PresenterHarness.kt",
            "web/scripts/validate-presenter-harness.ts",
            "web/test/presenterHarness.test.ts",
            "app/src/test/java/com/willio/jeanvilma/fishshopping/PresenterCpuHarnessTest.kt",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_presenter_harness.v1",
        "presenterHarnessMarker": MARKER,
        "phase": 21,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 21: presenter/render CPU snapshot harness with nestHud stage "
            "wired dual web↔Android."
        ),
        "sampleStage": "nestHud",
        "sampleField": "nestHudPressurePermille",
        "expect": {
            "schemaVersion": 27,
            "contentVersion": "5.0.0",
            "stageMin": 6,
            "snapshotFieldMin": 11,
            "presenterHarnessMissing": False,
            "openGapFlagMin": OPEN_GAP_MIN,
            "gates": [
                "stages",
                "snapshot_fields",
                "host_wire",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin() -> None:
    kick = json.loads(KICKOFF6.read_text(encoding="utf-8"))
    kick["gaps"]["presenterHarnessMissing"] = False
    dump(KICKOFF6, kick)

    p6 = json.loads(PARITY6.read_text(encoding="utf-8"))
    p6.setdefault("expect", {})["openGapFlagMin"] = OPEN_GAP_MIN
    dump(PARITY6, p6)

    for path in (ROOT / "fixtures").glob("parity-*.json"):
        fx = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(fx.get("expect"), dict) and "openGapFlagMin" in fx["expect"]:
            fx["expect"]["openGapFlagMin"] = OPEN_GAP_MIN
            dump(path, fx)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 6.0 Phase 21 presenter-harness complete (CPU snapshot + nestHud stage); "
        "Phases 1–20 remain green. Content stays 5.0.0 / schema 27. presenterHarnessMissing closed. "
        "Deploy/tag remain manual."
    )
    dod["presenterHarness"] = {
        "phase": 21,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "presenterHarnessMarker": MARKER,
        "catalog": "shared/ship/presenter-harness.json",
        "parityFixture": "shared/fixtures/parity-presenter-harness.json",
        "validateScript": "npm run presenterharness:validate",
        "checklist": [
            "≥6 stages including nestHud",
            "HarborScene/HarborRenderer harness wire",
            "kickoff presenterHarnessMissing=false",
            "presenterharness:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["presenterHarnessPhase"] = 21
    listing["presenterHarnessCatalog"] = "shared/ship/presenter-harness.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["presenterHarness"] = "shared/ship/presenter-harness.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-presenter-harness.json" not in fixtures:
        fixtures.append("parity-presenter-harness.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    write_ship()
    update_kickoff_dod_listing_pin()
    print(
        f"OK Phase 21 presenter-harness: stages={len(STAGES)} "
        f"fields={len(SNAPSHOT_FIELDS)} openGapFlagMin={OPEN_GAP_MIN}"
    )


if __name__ == "__main__":
    main()
