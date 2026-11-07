package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Phase 27 (post-1.0) — expanded Kotlin↔web parity lock contracts from
 * `shared/fixtures/parity-lock.json`.
 * Finish 2.0 Phase 29 adds achievements / weather / mastery / festival suites.
 */
object ParityLock {
    const val PHASE = 27
    const val SCHEMA = "fish.fixtures.parity_lock.v1"
    const val CATALOG = "shared/fixtures/parity-lock.json"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23
    const val FINISH2_PARITY_LOCK_PHASE = 29
    const val SUITE_FLOOR = 8
    const val FINISH2_SUITE_FLOOR = 4

    val SUITE_IDS = listOf(
        "prng",
        "starter_line",
        "entitlements_unlock",
        "legacy_migrations",
        "achievements",
        "weather_tide",
        "fishing_mastery",
        "festival_weekends",
    )

    val FINISH2_SUITE_IDS = listOf(
        "achievements",
        "weather_tide",
        "fishing_mastery",
        "festival_weekends",
    )

    val EXPANDED_EXPECT_FIELDS = listOf(
        "harborId",
        "fullHarborUnlock",
        "unlockedCosmetics",
        "unlockedAchievements",
        "speciesMasteryXp",
        "activeTechniqueId",
        "ownedDecor",
        "loanOwed",
        "coinGoal",
        "workers",
        "tutorialIndex",
        "coins",
        "ownedUpgrades",
        "completedQuests",
        "stats",
    )

    const val ENTITLEMENTS_FIXTURE = "fixtures/parity-entitlements.json"
    const val STARTER_LINE_FIXTURE = "fixtures/starter-line.json"
}
