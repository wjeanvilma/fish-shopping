package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 18 — offline/cloud/analytics hardening 4 ship contracts from
 * `shared/ship/offline-cloud-4.json`.
 */
object OfflineCloud4 {
    const val PHASE = 18
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.offline_cloud_4.v1"
    const val CATALOG = "shared/ship/offline-cloud-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-offline-cloud-4.json"
    const val MARKER = "authored-finish-6.0-phase-18"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val JOURNAL_DELTA_FIELD_COUNT = 4
    const val CONFLICT_FIELD_COUNT = 3
    const val SYNC_DIAGNOSTICS_FIELD_COUNT = 3
    const val MAX_FLUSH_RETRIES = 7
    const val RETRY_JITTER_MS = 750
    const val CIRCUIT_BREAKER_AFTER_DEAD_LETTERS = 3
    const val VALIDATE_SCRIPT = "offlinecloud4:validate"
    const val SOFT_OFFLINE_CLOUD_3_VALIDATE = "offlinecloud3:validate"
    const val CLOSES_GAP = "offlineCloud4Incomplete"
    const val EXTENDS_OFFLINE_CLOUD_3 = "shared/ship/offline-cloud-3.json"

    val JOURNAL_DELTA_FIELDS: List<String> = listOf(
        "loanRepaid",
        "contractRevenue",
        "rivalSalesStolen",
        "endgameSigilsEarned",
    )

    val CONFLICT_FIELDS: List<String> = listOf(
        "preferredSide",
        "conflictScore",
        "nestConflictHint",
    )

    val SYNC_DIAGNOSTICS_FIELDS: List<String> = listOf(
        "lastAttemptAgeMs",
        "flushFailures",
        "circuitOpen",
    )
}
