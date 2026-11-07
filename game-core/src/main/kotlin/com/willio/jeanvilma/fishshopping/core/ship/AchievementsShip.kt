package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 11 — achievements contracts from
 * `shared/ship/achievements.json`.
 */
object AchievementsShip {
    const val PHASE = 11
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.achievements.v1"
    const val CATALOG = "shared/ship/achievements.json"
    const val ACHIEVEMENT_COUNT = 14
    const val PARITY_FIXTURE = "shared/fixtures/parity-achievements.json"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 21

    val ENTRY_IDS: List<String> = listOf(
        "achievement.first_catch",
        "achievement.pier_regular",
        "achievement.rare_hook",
        "achievement.perfect_timing",
        "achievement.first_sale",
        "achievement.busy_counter",
        "achievement.line_cook",
        "achievement.first_hire",
        "achievement.contract_runner",
        "achievement.twin_harbors",
        "achievement.trophy_hunter",
        "achievement.bait_buyer",
        "achievement.rising_star",
        "achievement.museum_set",
    )
}
