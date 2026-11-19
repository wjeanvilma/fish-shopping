#!/usr/bin/env python3
"""
Finish 5.0 Phase 22 — offline/cloud/analytics hardening 3
(conflict UX polish, sync diagnostics, offline sim fidelity).

Usage:
  python3 shared/tools/author_offline_cloud_3.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "offline-cloud-3.json"
PARITY = ROOT / "fixtures" / "parity-offline-cloud-3.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
ANALYTICS = ROOT / "ops" / "remote-analytics-sink.json"
I18N_UI = {
    "en": ROOT / "i18n" / "ui-strings.en.json",
    "es": ROOT / "i18n" / "ui-strings.es.json",
    "pt": ROOT / "i18n" / "ui-strings.pt.json",
    "fr": ROOT / "i18n" / "ui-strings.fr.json",
    "ht": ROOT / "i18n" / "ui-strings.ht.json",
    "it": ROOT / "i18n" / "ui-strings.it.json",
    "ca": ROOT / "i18n" / "ui-strings.ca.json",
    "ru": ROOT / "i18n" / "ui-strings.ru.json",
}

MARKER = "authored-finish-5.0-phase-22"

JOURNAL_DELTA_FIELDS = [
    "wagesPaid",
    "repairSpent",
    "loanInterestAccrued",
    "revenueDelta",
]

CONFLICT_FIELDS = [
    "severity",
    "ageSkewMs",
    "syncDiagnostics",
]

SYNC_DIAGNOSTICS_FIELDS = [
    "queuePending",
    "queueAgeMs",
    "attempts",
]

ANALYTICS_RETRY = {
    "requeueOnFlushFailure": True,
    "maxFlushRetries": 5,
    "retryBackoffMs": 2000,
    "retryJitterMs": 500,
    "deadLetterAfterMaxRetries": True,
}

UI_I18N = {
    "en": {
        "cloud.severity": "Conflict severity",
        "cloud.syncDiagnostics": "Sync diagnostics",
        "cloud.ageSkew": "Save age skew",
    },
    "es": {
        "cloud.severity": "Gravedad del conflicto",
        "cloud.syncDiagnostics": "Diagnóstico de sync",
        "cloud.ageSkew": "Desfase de edad",
    },
    "pt": {
        "cloud.severity": "Gravidade do conflito",
        "cloud.syncDiagnostics": "Diagnóstico de sync",
        "cloud.ageSkew": "Desvio de idade",
    },
    "fr": {
        "cloud.severity": "Gravité du conflit",
        "cloud.syncDiagnostics": "Diagnostics de sync",
        "cloud.ageSkew": "Écart d'âge",
    },
    "ht": {
        "cloud.severity": "Gravite konfli",
        "cloud.syncDiagnostics": "Dyagnostik sync",
        "cloud.ageSkew": "Eka laj",
    },
    "it": {
        "cloud.severity": "Gravità del conflitto",
        "cloud.syncDiagnostics": "Diagnostica sync",
        "cloud.ageSkew": "Scarto di età",
    },
    "ca": {
        "cloud.severity": "Gravetat del conflicte",
        "cloud.syncDiagnostics": "Diagnòstic de sync",
        "cloud.ageSkew": "Desfasament d'edat",
    },
    "ru": {
        "cloud.severity": "Серьёзность конфликта",
        "cloud.syncDiagnostics": "Диагностика sync",
        "cloud.ageSkew": "Сдвиг возраста",
    },
}


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_ship() -> None:
    catalog = {
        "phase": 22,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.offline_cloud_3.v1",
        "description": (
            "Finish 5.0 Phase 22 — offline/cloud/analytics hardening 3. "
            "Conflict UX polish (severity/ageSkew/syncDiagnostics), cloud queue sync "
            "diagnostics, offline journal fidelity (wages/repairs/loan interest/revenue), "
            "analytics dead-letter + jitter retries. Schema stays 26 / content 4.0.0."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "offlineCloud3Marker": MARKER,
        "extendsOfflineCloud2": "shared/ship/offline-cloud-2.json",
        "journalDeltaFields": JOURNAL_DELTA_FIELDS,
        "conflictFields": CONFLICT_FIELDS,
        "syncDiagnosticsFields": SYNC_DIAGNOSTICS_FIELDS,
        "analyticsRetry": ANALYTICS_RETRY,
        "parityFixture": "shared/fixtures/parity-offline-cloud-3.json",
        "authorTool": "shared/tools/author_offline_cloud_3.py",
        "validateScript": "npm run offlinecloud3:validate",
        "softOfflineCloud2Validate": "npm run offlinecloud2:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "checklist": [
            "OfflineReport wages/repair/loanInterest/revenue deltas + journal lines",
            "CloudConflictOffer severity + ageSkewMs + syncDiagnostics in web↔Android UX",
            "Cloud offline queue attempts / queueAge diagnostics",
            "Analytics maxFlushRetries≥5 + jitter + deadLetterAfterMaxRetries",
            "kickoff offlineCloud3Incomplete=false",
            "offlinecloud3:validate green in CI",
            "offlinecloud2:validate soft-green",
            "schema stays 26 / content 4.0.0",
        ],
        "preflightGates": [
            "shared/ship/offline-cloud-3.json",
            "shared/fixtures/parity-offline-cloud-3.json",
            "shared/ship/offline-cloud-2.json",
            "shared/ops/remote-analytics-sink.json",
            "shared/tools/author_offline_cloud_3.py",
            "web/src/engine/offline.ts",
            "web/src/engine/cloudSync.ts",
            "web/src/cloud/cloudOfflineQueue.ts",
            "web/src/analytics/remoteAnalyticsSink.ts",
            "web/src/game/snapshotChoice.ts",
            "web/src/ui/TitlePanels.tsx",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/OfflineEarnings.kt",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/persistence/CloudSync.kt",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/RemoteAnalyticsPolicy.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/cloud/CloudOfflineQueue.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/game/SnapshotChoice.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt",
            "web/src/ship/offlineCloud3.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/OfflineCloud3.kt",
            "web/scripts/validate-offline-cloud-3.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_offline_cloud_3.v1",
        "offlineCloud3Marker": MARKER,
        "phase": 22,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 22: conflict severity/ageSkew/syncDiagnostics + "
            "offline journal wages/repair/loan/revenue + analytics dead-letter."
        ),
        "sampleJournalField": "wagesPaid",
        "sampleConflictField": "severity",
        "sampleSyncField": "queueAgeMs",
        "expect": {
            "schemaVersion": 26,
            "contentVersion": "4.0.0",
            "journalDeltaFieldCount": 4,
            "conflictFieldCount": 3,
            "syncDiagnosticsFieldCount": 3,
            "maxFlushRetries": 5,
            "retryJitterMs": 500,
            "deadLetterAfterMaxRetries": True,
            "offlineCloud3Incomplete": False,
            "gates": [
                "journal_deltas",
                "conflict_ux",
                "sync_diagnostics",
                "analytics_dead_letter",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_analytics_policy() -> None:
    policy = json.loads(ANALYTICS.read_text(encoding="utf-8"))
    batch = policy.setdefault("batch", {})
    batch["requeueOnFlushFailure"] = True
    batch["maxFlushRetries"] = ANALYTICS_RETRY["maxFlushRetries"]
    batch["retryBackoffMs"] = ANALYTICS_RETRY["retryBackoffMs"]
    batch["retryJitterMs"] = ANALYTICS_RETRY["retryJitterMs"]
    batch["deadLetterAfterMaxRetries"] = ANALYTICS_RETRY["deadLetterAfterMaxRetries"]
    dump(ANALYTICS, policy)


def update_kickoff_dod_listing_pin() -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["gaps"]["offlineCloud3Incomplete"] = False
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 5.0 Phase 22 offline-cloud-3 complete (conflict UX / sync diagnostics / "
        "offline fidelity); Phases 1–21 remain green. Content stays 4.0.0 / schema 26. "
        "offlineCloud3Incomplete closed. Deploy/tag remain manual."
    )
    dod["offlineCloud3"] = {
        "phase": 22,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "offlineCloud3Marker": MARKER,
        "catalog": "shared/ship/offline-cloud-3.json",
        "parityFixture": "shared/fixtures/parity-offline-cloud-3.json",
        "validateScript": "npm run offlinecloud3:validate",
        "checklist": [
            "offline journal fidelity deltas",
            "conflict severity/ageSkew/syncDiagnostics UX",
            "cloud queue sync diagnostics",
            "analytics dead-letter + jitter",
            "kickoff offlineCloud3Incomplete=false",
            "offlinecloud3:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["offlineCloud3Phase"] = 22
    listing["offlineCloud3Catalog"] = "shared/ship/offline-cloud-3.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["offlineCloud3"] = "shared/ship/offline-cloud-3.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-offline-cloud-3.json" not in fixtures:
        fixtures.append("parity-offline-cloud-3.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    for locale, path in I18N_UI.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in UI_I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    sync = ROOT / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        subprocess.check_call(["python3", str(sync)], cwd=str(REPO))

    update_analytics_policy()
    write_ship()
    update_kickoff_dod_listing_pin()
    print(
        f"OK Phase 22 offline-cloud-3: journal={len(JOURNAL_DELTA_FIELDS)} "
        f"conflict={len(CONFLICT_FIELDS)} sync={len(SYNC_DIAGNOSTICS_FIELDS)} "
        f"retries={ANALYTICS_RETRY['maxFlushRetries']}"
    )


if __name__ == "__main__":
    main()
