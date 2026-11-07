package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 29 — Parity lock 2.0 ship constants
 * (mirrors shared/ship/parity-lock-2.0.json).
 */
object ParityLock2 {
    const val PHASE = 29
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.parity_lock_2.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val PARITY_LOCK_2_MARKER = "authored-finish-2.0-phase-29"
    const val SUITE_FLOOR = 8
    const val FINISH2_SUITE_FLOOR = 4
    const val CATALOG = "shared/ship/parity-lock-2.0.json"
    const val PARITY_LOCK_CATALOG = "shared/fixtures/parity-lock.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-parity-lock-2.0.json"

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

    val FINISH2_FIXTURES = listOf(
        "shared/fixtures/parity-achievements.json",
        "shared/fixtures/parity-weather-tide.json",
        "shared/fixtures/parity-fishing-mastery.json",
        "shared/fixtures/parity-festival-weekends.json",
    )
}
