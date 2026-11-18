package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 29 — Parity lock 4.0 ship constants
 * (mirrors shared/ship/parity-lock-4.0.json).
 */
object ParityLock4 {
    const val PHASE = 29
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.parity_lock_4.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val PARITY_LOCK_4_MARKER = "authored-finish-4.0-phase-29"
    const val CLOSES_GAP = "parityLock4Missing"
    const val SUITE_FLOOR = 16
    const val FINISH2_SUITE_FLOOR = 4
    const val FINISH3_SUITE_FLOOR = 4
    const val FINISH4_SUITE_FLOOR = 4
    const val CATALOG = "shared/ship/parity-lock-4.0.json"
    const val PARITY_LOCK_CATALOG = "shared/fixtures/parity-lock.json"
    const val EXTENDS_PARITY_LOCK_3 = "shared/ship/parity-lock-3.0.json"
    const val EXTENDS_PARITY_LOCK_2 = "shared/ship/parity-lock-2.0.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-parity-lock-4.0.json"
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

    val REQUIRED_FINISH4_SUITE_IDS = listOf(
        "machines_11_12",
        "quests_contracts_4",
        "rival_markets_2",
        "endgame_2",
    )

    val FINISH4_FIXTURES = listOf(
        "shared/fixtures/parity-machines-11-12.json",
        "shared/fixtures/parity-quests-contracts-4.json",
        "shared/fixtures/parity-rival-markets-2.json",
        "shared/fixtures/parity-endgame-2.json",
    )
}
