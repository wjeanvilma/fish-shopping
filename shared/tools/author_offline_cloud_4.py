#!/usr/bin/env python3
"""
Finish 6.0 Phase 18 — offline/cloud/analytics hardening 4
(nest journal fidelity, conflict/sync deepen, analytics circuit-breaker).

Usage:
  python3 shared/tools/author_offline_cloud_4.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "offline-cloud-4.json"
PARITY = ROOT / "fixtures" / "parity-offline-cloud-4.json"
KICKOFF6 = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
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

MARKER = "authored-finish-6.0-phase-18"
OPEN_GAP_MIN = 11

JOURNAL_DELTA_FIELDS = [
    "loanRepaid",
    "contractRevenue",
    "rivalSalesStolen",
    "endgameSigilsEarned",
]

CONFLICT_FIELDS = [
    "preferredSide",
    "conflictScore",
    "nestConflictHint",
]

SYNC_DIAGNOSTICS_FIELDS = [
    "lastAttemptAgeMs",
    "flushFailures",
    "circuitOpen",
]

ANALYTICS_RETRY = {
    "requeueOnFlushFailure": True,
    "maxFlushRetries": 7,
    "retryBackoffMs": 2000,
    "retryJitterMs": 750,
    "deadLetterAfterMaxRetries": True,
    "circuitBreakerAfterDeadLetters": 3,
}

UI_I18N = {
    "en": {
        "cloud.preferredSide": "Preferred side",
        "cloud.conflictScore": "Conflict score",
        "cloud.nestConflictHint": "Nest conflict hint",
        "cloud.circuitOpen": "Analytics circuit open",
        "cloud.lastAttemptAge": "Last attempt age",
    },
    "es": {
        "cloud.preferredSide": "Lado preferido",
        "cloud.conflictScore": "Puntuación de conflicto",
        "cloud.nestConflictHint": "Pista de conflicto del nido",
        "cloud.circuitOpen": "Circuito de analytics abierto",
        "cloud.lastAttemptAge": "Edad del último intento",
    },
    "pt": {
        "cloud.preferredSide": "Lado preferido",
        "cloud.conflictScore": "Pontuação de conflito",
        "cloud.nestConflictHint": "Dica de conflito do ninho",
        "cloud.circuitOpen": "Circuito de analytics aberto",
        "cloud.lastAttemptAge": "Idade da última tentativa",
    },
    "fr": {
        "cloud.preferredSide": "Côté préféré",
        "cloud.conflictScore": "Score de conflit",
        "cloud.nestConflictHint": "Indice de conflit du nid",
        "cloud.circuitOpen": "Circuit analytics ouvert",
        "cloud.lastAttemptAge": "Âge de la dernière tentative",
    },
    "ht": {
        "cloud.preferredSide": "Bò pi pito",
        "cloud.conflictScore": "Nòt konfli",
        "cloud.nestConflictHint": "Endikasyon konfli nich",
        "cloud.circuitOpen": "Sikui analytics louvri",
        "cloud.lastAttemptAge": "Laj dènye tantativ",
    },
    "it": {
        "cloud.preferredSide": "Lato preferito",
        "cloud.conflictScore": "Punteggio conflitto",
        "cloud.nestConflictHint": "Suggerimento conflitto nido",
        "cloud.circuitOpen": "Circuito analytics aperto",
        "cloud.lastAttemptAge": "Età ultimo tentativo",
    },
    "ca": {
        "cloud.preferredSide": "Costat preferit",
        "cloud.conflictScore": "Puntuació de conflicte",
        "cloud.nestConflictHint": "Pista de conflicte del niu",
        "cloud.circuitOpen": "Circuit d'analytics obert",
        "cloud.lastAttemptAge": "Edat del darrer intent",
    },
    "ru": {
        "cloud.preferredSide": "Предпочтительная сторона",
        "cloud.conflictScore": "Оценка конфликта",
        "cloud.nestConflictHint": "Подсказка конфликта гнезда",
        "cloud.circuitOpen": "Контур analytics открыт",
        "cloud.lastAttemptAge": "Возраст последней попытки",
    },
}


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_ship() -> None:
    catalog = {
        "phase": 18,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.offline_cloud_4.v1",
        "description": (
            "Finish 6.0 Phase 18 — offline/cloud/analytics hardening 4. "
            "Nest journal fidelity (loanRepaid/contractRevenue/rivalSalesStolen/endgameSigilsEarned), "
            "conflict preferredSide/conflictScore/nestConflictHint, queue lastAttemptAge/flushFailures/"
            "circuitOpen, analytics retries≥7 + jitter 750 + circuitBreakerAfterDeadLetters. "
            "Schema stays 27 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "offlineCloud4Marker": MARKER,
        "extendsOfflineCloud3": "shared/ship/offline-cloud-3.json",
        "journalDeltaFields": JOURNAL_DELTA_FIELDS,
        "conflictFields": CONFLICT_FIELDS,
        "syncDiagnosticsFields": SYNC_DIAGNOSTICS_FIELDS,
        "analyticsRetry": ANALYTICS_RETRY,
        "parityFixture": "shared/fixtures/parity-offline-cloud-4.json",
        "authorTool": "shared/tools/author_offline_cloud_4.py",
        "validateScript": "npm run offlinecloud4:validate",
        "softOfflineCloud3Validate": "npm run offlinecloud3:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "checklist": [
            "OfflineReport nest journal deltas + journal lines",
            "CloudConflictOffer preferredSide/conflictScore/nestConflictHint in web↔Android UX",
            "Cloud offline queue lastAttemptAge/flushFailures/circuitOpen diagnostics",
            "Analytics maxFlushRetries≥7 + jitter 750 + circuitBreakerAfterDeadLetters",
            "kickoff offlineCloud4Incomplete=false",
            "offlinecloud4:validate green in CI",
            "offlinecloud3:validate soft-green",
            "schema stays 27 / content 5.0.0",
            "openGapFlagMin 12→11",
        ],
        "preflightGates": [
            "shared/ship/offline-cloud-4.json",
            "shared/fixtures/parity-offline-cloud-4.json",
            "shared/ship/offline-cloud-3.json",
            "shared/ops/remote-analytics-sink.json",
            "shared/tools/author_offline_cloud_4.py",
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
            "web/src/ship/offlineCloud4.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/OfflineCloud4.kt",
            "web/scripts/validate-offline-cloud-4.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_offline_cloud_4.v1",
        "offlineCloud4Marker": MARKER,
        "phase": 18,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 18: nest journal deltas + preferredSide/conflictScore/"
            "nestConflictHint + queue circuit diagnostics + analytics circuit-breaker."
        ),
        "sampleJournalField": "loanRepaid",
        "sampleConflictField": "preferredSide",
        "sampleSyncField": "circuitOpen",
        "expect": {
            "schemaVersion": 27,
            "contentVersion": "5.0.0",
            "journalDeltaFieldCount": 4,
            "conflictFieldCount": 3,
            "syncDiagnosticsFieldCount": 3,
            "maxFlushRetries": 7,
            "retryJitterMs": 750,
            "circuitBreakerAfterDeadLetters": 3,
            "deadLetterAfterMaxRetries": True,
            "offlineCloud4Incomplete": False,
            "openGapFlagMin": OPEN_GAP_MIN,
            "gates": [
                "nest_journal_deltas",
                "nest_conflict_ux",
                "nest_sync_diagnostics",
                "analytics_circuit_breaker",
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
    batch["circuitBreakerAfterDeadLetters"] = ANALYTICS_RETRY["circuitBreakerAfterDeadLetters"]
    dump(ANALYTICS, policy)


def update_kickoff_dod_listing_pin() -> None:
    kick = json.loads(KICKOFF6.read_text(encoding="utf-8"))
    kick["gaps"]["offlineCloud4Incomplete"] = False
    dump(KICKOFF6, kick)

    p6 = json.loads(PARITY6.read_text(encoding="utf-8"))
    p6.setdefault("expect", {})["openGapFlagMin"] = OPEN_GAP_MIN
    dump(PARITY6, p6)

    for rel in (
        "parity-quests-contracts-6.json",
        "parity-atmosphere-6.json",
        "parity-species-150.json",
        "parity-audio-pack-6.json",
        "parity-product-art-6.json",
        "parity-machines-15-16.json",
        "parity-vfx-juice-6.json",
        "parity-endgame-4.json",
        "parity-rivals-seasonal-6.json",
        "parity-staff-ai-4.json",
        "parity-economy-bank-4.json",
    ):
        path = ROOT / "fixtures" / rel
        if not path.is_file():
            continue
        fx = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(fx.get("expect"), dict) and "openGapFlagMin" in fx["expect"]:
            fx["expect"]["openGapFlagMin"] = OPEN_GAP_MIN
            dump(path, fx)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 6.0 Phase 18 offline-cloud-4 complete (nest journal / conflict / circuit); "
        "Phases 1–17 remain green. Content stays 5.0.0 / schema 27. offlineCloud4Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["offlineCloud4"] = {
        "phase": 18,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "offlineCloud4Marker": MARKER,
        "catalog": "shared/ship/offline-cloud-4.json",
        "parityFixture": "shared/fixtures/parity-offline-cloud-4.json",
        "validateScript": "npm run offlinecloud4:validate",
        "checklist": [
            "nest journal fidelity deltas",
            "preferredSide/conflictScore/nestConflictHint UX",
            "queue circuit sync diagnostics",
            "analytics circuit-breaker + jitter 750",
            "kickoff offlineCloud4Incomplete=false",
            "offlinecloud4:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["offlineCloud4Phase"] = 18
    listing["offlineCloud4Catalog"] = "shared/ship/offline-cloud-4.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["offlineCloud4"] = "shared/ship/offline-cloud-4.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-offline-cloud-4.json" not in fixtures:
        fixtures.append("parity-offline-cloud-4.json")
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
        f"OK Phase 18 offline-cloud-4: journal={len(JOURNAL_DELTA_FIELDS)} "
        f"conflict={len(CONFLICT_FIELDS)} sync={len(SYNC_DIAGNOSTICS_FIELDS)} "
        f"retries={ANALYTICS_RETRY['maxFlushRetries']} openGapFlagMin={OPEN_GAP_MIN}"
    )


if __name__ == "__main__":
    main()
