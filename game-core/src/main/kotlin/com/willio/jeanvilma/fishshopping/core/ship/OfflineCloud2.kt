package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 21 — offline/cloud/analytics hardening ship contracts from
 * `shared/ship/offline-cloud-2.json`.
 */
object OfflineCloud2 {
    const val PHASE = 21
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.offline_cloud_2.v1"
    const val CATALOG = "shared/ship/offline-cloud-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-offline-cloud-2.json"
    const val MARKER = "authored-finish-4.0-phase-21"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val DAILY_OBJECTIVE_MIN = 10
    const val BOARD_SLOTS_MIN = 4
    const val VALIDATE_SCRIPT = "offlinecloud2:validate"

    val OBJECTIVE_IDS: List<String> = listOf(
        "daily.catch_five",
        "daily.sell_three",
        "daily.stock_counter",
        "daily.feed_machines",
        "daily.contract_one",
        "daily.perfect_reel",
        "daily.hire_help",
        "daily.rare_catch",
        "daily.loan_care",
        "daily.rival_beat",
    )

    val JOURNAL_DELTA_FIELDS: List<String> = listOf(
        "contractsCompleted",
        "maintenancePaid",
        "itemsSpoiled",
        "rivalBeats",
    )

    val CONFLICT_FIELDS: List<String> = listOf(
        "reasonCode",
        "diffHints",
    )
}
