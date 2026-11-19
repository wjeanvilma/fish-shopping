package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 22 — offline/cloud/analytics hardening 3 ship contracts from
 * `shared/ship/offline-cloud-3.json`.
 */
object OfflineCloud3 {
    const val PHASE = 22
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.offline_cloud_3.v1"
    const val CATALOG = "shared/ship/offline-cloud-3.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-offline-cloud-3.json"
    const val MARKER = "authored-finish-5.0-phase-22"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val JOURNAL_DELTA_FIELD_COUNT = 4
    const val CONFLICT_FIELD_COUNT = 3
    const val SYNC_DIAGNOSTICS_FIELD_COUNT = 3
    const val MAX_FLUSH_RETRIES = 5
    const val RETRY_JITTER_MS = 500
    const val VALIDATE_SCRIPT = "offlinecloud3:validate"
    const val SOFT_OFFLINE_CLOUD_2_VALIDATE = "offlinecloud2:validate"
    const val CLOSES_GAP = "offlineCloud3Incomplete"
    const val EXTENDS_OFFLINE_CLOUD_2 = "shared/ship/offline-cloud-2.json"

    val JOURNAL_DELTA_FIELDS: List<String> = listOf(
        "wagesPaid",
        "repairSpent",
        "loanInterestAccrued",
        "revenueDelta",
    )

    val CONFLICT_FIELDS: List<String> = listOf(
        "severity",
        "ageSkewMs",
        "syncDiagnostics",
    )

    val SYNC_DIAGNOSTICS_FIELDS: List<String> = listOf(
        "queuePending",
        "queueAgeMs",
        "attempts",
    )
}
