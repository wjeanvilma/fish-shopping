package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 29 — Parity lock 5.0 ship constants
 * (mirrors shared/ship/parity-lock-5.0.json).
 */
object ParityLock5 {
    const val PHASE = 29
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.parity_lock_5.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val PARITY_LOCK_5_MARKER = "authored-finish-5.0-phase-29"
    const val CLOSES_GAP = "parityLock5Missing"
    const val SUITE_FLOOR = 20
    const val FINISH2_SUITE_FLOOR = 4
    const val FINISH3_SUITE_FLOOR = 4
    const val FINISH4_SUITE_FLOOR = 4
    const val FINISH5_SUITE_FLOOR = 4
    const val CATALOG = "shared/ship/parity-lock-5.0.json"
    const val PARITY_LOCK_CATALOG = "shared/fixtures/parity-lock.json"
    const val EXTENDS_PARITY_LOCK_4 = "shared/ship/parity-lock-4.0.json"
    const val EXTENDS_PARITY_LOCK_3 = "shared/ship/parity-lock-3.0.json"
    const val EXTENDS_PARITY_LOCK_2 = "shared/ship/parity-lock-2.0.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-parity-lock-5.0.json"
    const val VALIDATE_SCRIPT = "parity5:validate"
    const val SOFT_PARITY_4_VALIDATE = "parity4:validate"
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

    val FINISH5_FIXTURES = listOf(
        "shared/fixtures/parity-machines-13-14.json",
        "shared/fixtures/parity-quests-contracts-5.json",
        "shared/fixtures/parity-endgame-3.json",
        "shared/fixtures/parity-rivals-seasonal-5.json",
    )
}
