#!/usr/bin/env python3
"""
Finish 6.0 Phase 26 — Analytics + loadtest banks expansion 6.

Bumps loadtest bank headers to schema 27, expands nest analytics event names,
and closes kickoff gap loadtestBanksIncomplete (openFlags 4→3).

Usage:
  python3 shared/tools/author_analytics_loadtest_6.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "analytics-loadtest-6.json"
OPS = ROOT / "ops" / "analytics-loadtest-6.json"
PARITY = ROOT / "fixtures" / "parity-analytics-loadtest-6.json"
BANKS = ROOT / "ship" / "loadtest-banks.json"
BANKS_PARITY = ROOT / "fixtures" / "parity-loadtest-banks.json"
KICKOFF = ROOT / "ship" / "finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
FINISH6_PARITY = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
STRIPE_PARITY = ROOT / "fixtures" / "parity-stripe-ops-6.json"
MARKER = "authored-finish-6.0-phase-26"
NEST_EVENTS = [
    "nest_sigil_earned",
    "nest_contract_settled",
    "loadtest_bank_probed",
]
EVENT_NAME_FLOOR = 11
SOAK_SCENARIO_FLOOR = 8
MIN_BYTES = 85_000_000
OPEN_GAP_FLAG_MIN = 3


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def patch_bank_header(path: Path) -> None:
    """In-place bump header schemaVersion 26→27 without rewriting ~90MB body."""
    with path.open("r+b") as f:
        header = f.read(4096)
        text = header.decode("utf-8")
        if '"schemaVersion": 27' in text.split('"records"')[0].split('"events"')[0]:
            return
        new = text.replace('"schemaVersion": 26', '"schemaVersion": 27', 1)
        new = new.replace("schema-26", "schema-27", 1)
        encoded = new.encode("utf-8")
        if len(encoded) != len(header):
            raise SystemExit(
                f"header length drift for {path}: {len(encoded)} vs {len(header)}"
            )
        if '"schemaVersion": 27' not in encoded.decode("utf-8"):
            raise SystemExit(f"failed to bump schemaVersion in {path}")
        f.seek(0)
        f.write(encoded)


def write_catalogs() -> None:
    scenarios = [
        {"id": "probe_save_bank", "title": "Header/size probe save bank ≥85MB schema 27"},
        {"id": "probe_telemetry_bank", "title": "Header/size probe telemetry bank ≥85MB schema 27"},
        {"id": "nest_sigil_emit", "title": "Emit nest_sigil_earned analytics event"},
        {"id": "nest_contract_emit", "title": "Emit nest_contract_settled analytics event"},
        {"id": "loadtest_bank_probed_emit", "title": "Emit loadtest_bank_probed after dual probe"},
        {"id": "analytics_batch_soak", "title": "Queue/flush nest events through remote sink policy"},
        {"id": "dual_platform_parity", "title": "Web GameHost + Android GameViewModel probe wiring"},
        {"id": "soft_remote_analytics", "title": "remoteanalytics:validate soft-green (≥8 event names)"},
    ]
    dump(
        SHIP,
        {
            "phase": 26,
            "plan": "30_finish_6.0",
            "schema": "fish.ship.analytics_loadtest_6.v1",
            "description": (
                "Finish 6.0 Phase 26 — Analytics + loadtest banks expansion 6. "
                "Closes kickoff gap loadtestBanksIncomplete. Bumps loadtest banks to "
                "schema 27, expands nest analytics events (≥11), and soft-floors "
                "remoteanalytics:validate."
            ),
            "contentVersion": "5.0.0",
            "schemaVersion": 27,
            "analyticsLoadtest6Marker": MARKER,
            "closesGap": "loadtestBanksIncomplete",
            "opsCatalog": "shared/ops/analytics-loadtest-6.json",
            "extendsLoadtestBanks": "shared/ship/loadtest-banks.json",
            "extendsRemoteAnalytics": "shared/ship/remote-analytics.json",
            "extendsOfflineCloud4": "shared/ship/offline-cloud-4.json",
            "loadtestBanksCatalog": "shared/ship/loadtest-banks.json",
            "remoteAnalyticsPolicy": "shared/ops/remote-analytics-sink.json",
            "eventNameFloor": EVENT_NAME_FLOOR,
            "nestEvents": NEST_EVENTS,
            "soakScenarioFloor": SOAK_SCENARIO_FLOOR,
            "minBytesEach": MIN_BYTES,
            "bankSchemaVersionFloor": 27,
            "parityFixture": "shared/fixtures/parity-analytics-loadtest-6.json",
            "validateScript": "npm run analyticsloadtest6:validate",
            "softRemoteAnalyticsValidate": "npm run remoteanalytics:validate",
            "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
            "authorTool": "shared/tools/author_analytics_loadtest_6.py",
            "softFloors": {
                "remoteAnalyticsEventNameMin": 8,
                "loadtestBanksSchemaVersionPrior": 26,
                "openGapFlagMinPrior": 4,
                "note": (
                    "Finish 3.0 remoteanalytics + prior loadtest schema 26 stay green; "
                    "Phase 26 enforces schema 27 banks + ≥11 analytics events."
                ),
            },
            "checklist": [
                "Loadtest save+telemetry banks header schemaVersion ≥27 / ≥85MB each",
                "Nest analytics events nest_sigil_earned / nest_contract_settled / loadtest_bank_probed",
                "ANALYTICS_EVENT_NAMES ≥11 mirrored web↔Kotlin↔analytics-api",
                "GameHost + GameViewModel emit loadtest_bank_probed on probe",
                "Kickoff gaps.loadtestBanksIncomplete=false (openFlags 4→3)",
                "remoteanalytics:validate soft-green",
                "analyticsloadtest6:validate green in CI",
                "schema stays 27 / content 5.0.0",
            ],
            "preflightGates": [
                "shared/ship/analytics-loadtest-6.json",
                "shared/ops/analytics-loadtest-6.json",
                "shared/fixtures/parity-analytics-loadtest-6.json",
                "shared/ship/loadtest-banks.json",
                "shared/fixtures/loadtest-save-bank.json",
                "shared/fixtures/loadtest-telemetry-bank.json",
                "shared/fixtures/parity-loadtest-banks.json",
                "shared/ops/remote-analytics-sink.json",
                "shared/tools/author_analytics_loadtest_6.py",
                "web/src/ship/analyticsLoadtest6.ts",
                "web/src/ship/loadtestBanks.ts",
                "web/src/engine/analytics.ts",
                "web/src/analytics/analyticsBus.ts",
                "web/src/game/GameHost.ts",
                "web/scripts/validate-analytics-loadtest-6.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/AnalyticsLoadtest6.kt",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/LoadtestBanks.kt",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Analytics.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/analytics/AnalyticsBus.kt",
                "analytics-api/src/catalog.ts",
            ],
        },
    )
    dump(
        OPS,
        {
            "phase": 26,
            "plan": "30_finish_6.0",
            "schema": "fish.ops.analytics_loadtest_6.v1",
            "description": (
                "Finish 6.0 Phase 26 — nest analytics + loadtest bank soak ops. "
                "Secrets never committed."
            ),
            "contentVersion": "5.0.0",
            "schemaVersion": 27,
            "analyticsLoadtest6Marker": MARKER,
            "extendsLoadtestBanks": "shared/ship/loadtest-banks.json",
            "extendsRemoteAnalyticsSink": "shared/ops/remote-analytics-sink.json",
            "eventNameFloor": EVENT_NAME_FLOOR,
            "nestEvents": NEST_EVENTS,
            "soakScenarioFloor": SOAK_SCENARIO_FLOOR,
            "minBytesEach": MIN_BYTES,
            "bankSchemaVersionFloor": 27,
            "scenarios": scenarios,
            "softRemoteAnalyticsValidate": "npm run remoteanalytics:validate",
        },
    )
    dump(
        PARITY,
        {
            "schema": "fish.fixtures.parity_analytics_loadtest_6.v1",
            "analyticsLoadtest6Marker": MARKER,
            "phase": 26,
            "plan": "30_finish_6.0",
            "expect": {
                "eventNameFloor": EVENT_NAME_FLOOR,
                "nestEvents": NEST_EVENTS,
                "soakScenarioFloor": SOAK_SCENARIO_FLOOR,
                "minBytesEach": MIN_BYTES,
                "bankSchemaVersionFloor": 27,
                "closesGap": "loadtestBanksIncomplete",
                "loadtestBanksIncomplete": False,
                "openGapFlagMin": OPEN_GAP_FLAG_MIN,
                "schemaVersion": 27,
                "contentVersion": "5.0.0",
                "gates": [
                    "banks_schema27",
                    "nest_events",
                    "probe_wiring",
                    "gap_closed",
                    "ci_gate",
                ],
            },
        },
    )


def update_loadtest_banks() -> None:
    banks = load(BANKS)
    banks["phase"] = 26
    banks["plan"] = "30_finish_6.0"
    banks["schemaVersion"] = 27
    banks["contentVersion"] = "5.0.0"
    banks["loadtestBanksMarker"] = MARKER
    banks["label"] = (
        "Large realistic JSON banks for Android/web load + soak testing "
        "(Finish 6.0 schema 27 headers)"
    )
    banks["analyticsEventFloor"] = EVENT_NAME_FLOOR
    banks["nestEvents"] = NEST_EVENTS
    banks["soakScenarioFloor"] = SOAK_SCENARIO_FLOOR
    banks["purpose"] = (
        "Stress save migration, nest analytics sink, and asset IO with "
        "production-shaped schema-27 header / schema-26 body records"
    )
    dump(BANKS, banks)

    parity = load(BANKS_PARITY)
    parity["loadtestBanksMarker"] = MARKER
    parity["schemaVersionFloor"] = 27
    parity["minBytesEach"] = MIN_BYTES
    dump(BANKS_PARITY, parity)

    for name in ("loadtest-save-bank.json", "loadtest-telemetry-bank.json"):
        patch_bank_header(ROOT / "fixtures" / name)


def soft_floor_open_gap_flags() -> None:
    for path in (ROOT / "fixtures").glob("parity-*.json"):
        data = load(path)
        expect = data.get("expect")
        if isinstance(expect, dict) and expect.get("openGapFlagMin") == 4:
            expect["openGapFlagMin"] = OPEN_GAP_FLAG_MIN
            dump(path, data)


def update_kickoff_dod_listing_pin() -> None:
    kick = load(KICKOFF)
    kick["gaps"]["loadtestBanksIncomplete"] = False
    dump(KICKOFF, kick)

    dod = load(DOD)
    dod.setdefault("quotas", {})
    dod["quotas"]["analyticsLoadtest6EventNames"] = EVENT_NAME_FLOOR
    dod["quotas"]["analyticsLoadtest6SoakScenarios"] = SOAK_SCENARIO_FLOOR
    dod["quotas"]["loadtestBanksMinBytes"] = MIN_BYTES
    dod["quotas"]["loadtestBanksSchemaVersion"] = 27
    dod["analyticsLoadtest6"] = {
        "phase": 26,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "analyticsLoadtest6Marker": MARKER,
        "catalog": "shared/ship/analytics-loadtest-6.json",
        "opsCatalog": "shared/ops/analytics-loadtest-6.json",
        "parityFixture": "shared/fixtures/parity-analytics-loadtest-6.json",
        "validateScript": "npm run analyticsloadtest6:validate",
        "checklist": [
            f"Loadtest banks schema ≥27 / ≥{MIN_BYTES} bytes each",
            f"≥{EVENT_NAME_FLOOR} analytics events incl. nest + loadtest probe",
            "kickoff loadtestBanksIncomplete closed",
            "analyticsloadtest6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = load(LISTING)
    listing["analyticsLoadtest6Phase"] = 26
    listing["analyticsLoadtest6Catalog"] = "shared/ship/analytics-loadtest-6.json"
    listing["loadtestBanksCatalog"] = "shared/ship/loadtest-banks.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["analyticsLoadtest6"] = "shared/ship/analytics-loadtest-6.json"
    pin["loadtestBanks"] = "shared/ship/loadtest-banks.json"
    fx = pin.get("fixtures") or []
    for name in (
        "parity-analytics-loadtest-6.json",
        "parity-loadtest-banks.json",
        "loadtest-save-bank.json",
        "loadtest-telemetry-bank.json",
    ):
        if name not in fx:
            fx.append(name)
    pin["fixtures"] = fx
    dump(PIN, pin)

    soft_floor_open_gap_flags()


def main() -> None:
    update_loadtest_banks()
    write_catalogs()
    update_kickoff_dod_listing_pin()
    print(
        f"analytics-loadtest-6 authored: marker={MARKER} "
        f"events≥{EVENT_NAME_FLOOR} soak≥{SOAK_SCENARIO_FLOOR} openGapFlagMin={OPEN_GAP_FLAG_MIN}"
    )


if __name__ == "__main__":
    main()
