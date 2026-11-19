package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Phase 27 (post-1.0) — expanded Kotlin↔web parity lock contracts from
 * `shared/fixtures/parity-lock.json`.
 * Finish 2.0 Phase 29 adds achievements / weather / mastery / festival suites.
 * Finish 3.0 Phase 29 adds rivals / schema24 endgame / machines 9–10 / quests-contracts-3.
 * Finish 4.0 Phase 29 adds machines 11–12 / quests-contracts-4 / rivals-2 / endgame-2.
 * Finish 5.0 Phase 29 adds machines 13–14 / quests-contracts-5 / endgame-3 / rivals-seasonal-5.
 */
object ParityLock {
    const val PHASE = 27
    const val SCHEMA = "fish.fixtures.parity_lock.v1"
    const val CATALOG = "shared/fixtures/parity-lock.json"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val FINISH2_PARITY_LOCK_PHASE = 29
    const val FINISH3_PARITY_LOCK_PHASE = 29
    const val FINISH4_PARITY_LOCK_PHASE = 29
    const val FINISH5_PARITY_LOCK_PHASE = 29
    const val SUITE_FLOOR = 20
    const val FINISH2_SUITE_FLOOR = 4
    const val FINISH3_SUITE_FLOOR = 4
    const val FINISH4_SUITE_FLOOR = 4
    const val FINISH5_SUITE_FLOOR = 4

    val SUITE_IDS = listOf(
        "prng",
        "starter_line",
        "entitlements_unlock",
        "legacy_migrations",
        "achievements",
        "weather_tide",
        "fishing_mastery",
        "festival_weekends",
        "rival_markets",
        "schema24_endgame",
        "machines_9_10",
        "quests_contracts_3",
        "machines_11_12",
        "quests_contracts_4",
        "rival_markets_2",
        "endgame_2",
        "machines_13_14",
        "quests_contracts_5",
        "endgame_3",
        "rivals_seasonal_5",
    )

    val FINISH2_SUITE_IDS = listOf(
        "achievements",
        "weather_tide",
        "fishing_mastery",
        "festival_weekends",
    )

    val FINISH3_SUITE_IDS = listOf(
        "rival_markets",
        "schema24_endgame",
        "machines_9_10",
        "quests_contracts_3",
    )

    val FINISH4_SUITE_IDS = listOf(
        "machines_11_12",
        "quests_contracts_4",
        "rival_markets_2",
        "endgame_2",
    )

    val FINISH5_SUITE_IDS = listOf(
        "machines_13_14",
        "quests_contracts_5",
        "endgame_3",
        "rivals_seasonal_5",
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
