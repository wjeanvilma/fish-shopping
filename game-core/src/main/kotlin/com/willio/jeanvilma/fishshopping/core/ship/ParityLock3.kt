package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 29 — Parity lock 3.0 ship constants
 * (mirrors shared/ship/parity-lock-3.0.json).
 */
object ParityLock3 {
    const val PHASE = 29
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.parity_lock_3.v1"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val PARITY_LOCK_3_MARKER = "authored-finish-3.0-phase-29"
    const val SUITE_FLOOR = 12
    const val FINISH2_SUITE_FLOOR = 4
    const val FINISH3_SUITE_FLOOR = 4
    const val CATALOG = "shared/ship/parity-lock-3.0.json"
    const val PARITY_LOCK_CATALOG = "shared/fixtures/parity-lock.json"
    const val EXTENDS_PARITY_LOCK_2 = "shared/ship/parity-lock-2.0.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-parity-lock-3.0.json"
    const val SIM_HZ_INVARIANT = 20

    val REQUIRED_BASELINE_SUITE_IDS = listOf(
        "prng",
        "starter_line",
        "entitlements_unlock",
        "legacy_migrations",
    )

    val REQUIRED_FINISH2_SUITE_IDS = listOf(
        "achievements",
        "weather_tide",
        "fishing_mastery",
        "festival_weekends",
    )

    val REQUIRED_FINISH3_SUITE_IDS = listOf(
        "rival_markets",
        "schema24_endgame",
        "machines_9_10",
        "quests_contracts_3",
    )

    val FINISH3_FIXTURES = listOf(
        "shared/fixtures/parity-rival-markets.json",
        "shared/fixtures/parity-schema-24-endgame.json",
        "shared/fixtures/parity-machines-9-10.json",
        "shared/fixtures/parity-quests-contracts-3.json",
    )
}
