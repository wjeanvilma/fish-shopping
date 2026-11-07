package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Phase 27 (post-1.0) — expanded Kotlin↔web parity lock contracts from
 * `shared/fixtures/parity-lock.json`.
 */
object ParityLock {
    const val PHASE = 27
    const val SCHEMA = "fish.fixtures.parity_lock.v1"
    const val CATALOG = "shared/fixtures/parity-lock.json"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 20

    val SUITE_IDS = listOf(
        "prng",
        "starter_line",
        "entitlements_unlock",
        "legacy_migrations",
    )

    val EXPANDED_EXPECT_FIELDS = listOf(
        "harborId",
        "fullHarborUnlock",
        "unlockedCosmetics",
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
