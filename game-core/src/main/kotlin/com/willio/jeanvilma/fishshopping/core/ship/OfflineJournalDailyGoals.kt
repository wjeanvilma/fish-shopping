package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 18 — offline journal + daily goals ship constants
 * (mirrors shared/ship/offline-journal-daily-goals.json).
 */
object OfflineJournalDailyGoals {
    const val PHASE = 18
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.offline_journal_daily_goals.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val DAILY_OBJECTIVE_COUNT = 6
    const val BOARD_SLOTS = 3
    const val PARITY_FIXTURE = "shared/fixtures/parity-offline-journal-daily-goals.json"
    const val CATALOG = "shared/ship/offline-journal-daily-goals.json"

    val OBJECTIVE_IDS = listOf(
        "daily.catch_five",
        "daily.sell_three",
        "daily.stock_counter",
        "daily.feed_machines",
        "daily.contract_one",
        "daily.perfect_reel",
    )
}
