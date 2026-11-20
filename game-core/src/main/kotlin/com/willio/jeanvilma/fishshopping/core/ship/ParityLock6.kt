package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 29 — Parity lock 6.0 ship constants
 * (mirrors shared/ship/parity-lock-6.0.json).
 */
object ParityLock6 {
    const val PHASE = 29
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.parity_lock_6.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val PARITY_LOCK_6_MARKER = "authored-finish-6.0-phase-29"
    const val CLOSES_GAP = "parityLock6Missing"
    const val SUITE_FLOOR = 24
    const val FINISH2_SUITE_FLOOR = 4
    const val FINISH3_SUITE_FLOOR = 4
    const val FINISH4_SUITE_FLOOR = 4
    const val FINISH5_SUITE_FLOOR = 4
    const val FINISH6_SUITE_FLOOR = 4
    const val CATALOG = "shared/ship/parity-lock-6.0.json"
    const val PARITY_LOCK_CATALOG = "shared/fixtures/parity-lock.json"
    const val EXTENDS_PARITY_LOCK_5 = "shared/ship/parity-lock-5.0.json"
    const val EXTENDS_PARITY_LOCK_4 = "shared/ship/parity-lock-4.0.json"
    const val EXTENDS_PARITY_LOCK_3 = "shared/ship/parity-lock-3.0.json"
    const val EXTENDS_PARITY_LOCK_2 = "shared/ship/parity-lock-2.0.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-parity-lock-6.0.json"
    const val VALIDATE_SCRIPT = "parity6:validate"
    const val SOFT_PARITY_5_VALIDATE = "parity5:validate"
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

    val REQUIRED_FINISH5_SUITE_IDS = listOf(
        "machines_13_14",
        "quests_contracts_5",
        "endgame_3",
        "rivals_seasonal_5",
    )

    val REQUIRED_FINISH6_SUITE_IDS = listOf(
        "machines_15_16",
        "quests_contracts_6",
        "endgame_4",
        "rivals_seasonal_6",
    )

    val FINISH6_FIXTURES = listOf(
        "shared/fixtures/parity-machines-15-16.json",
        "shared/fixtures/parity-quests-contracts-6.json",
        "shared/fixtures/parity-endgame-4.json",
        "shared/fixtures/parity-rivals-seasonal-6.json",
    )
}
