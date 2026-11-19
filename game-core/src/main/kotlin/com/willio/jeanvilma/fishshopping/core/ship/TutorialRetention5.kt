package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 19 — tutorial friction rewrite + retention hooks ship constants
 * (mirrors shared/ship/tutorial-retention-5.json).
 */
object TutorialRetention5 {
    const val PHASE = 19
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.tutorial_retention_5.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val TUTORIAL_RETENTION_5_MARKER = "authored-finish-5.0-phase-19"
    const val CATALOG = "shared/ship/tutorial-retention-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-tutorial-retention-5.json"
    const val TUTORIAL_STEPS_MIN = 11
    const val HIGH_FRICTION_MIN = 7
    const val NUDGES_MIN = 7
    const val DAILY_OBJECTIVES_MIN = 14
    const val BOARD_SLOTS_MIN = 5
    const val WEEKLY_OBJECTIVES_MIN = 4
    const val WEEKLY_BOARD_SLOTS_MIN = 2
    const val MAX_STREAK_BONUS_DAYS_MIN = 14
    const val SIM_HZ_INVARIANT = 20
    const val CLOSES_GAP = "tutorialRetentionIncomplete"

    val NEW_DAILY_OBJECTIVE_IDS: List<String> = listOf(
        "daily.quest_push",
        "daily.chain_run",
        "daily.harbor_hop",
        "daily.premium_plate",
    )

    val NEW_WEEKLY_OBJECTIVE_IDS: List<String> = listOf(
        "weekly.rival_week",
        "weekly.chain_week",
        "weekly.harbor_circuit",
        "weekly.quest_surge",
    )

    val MID_GAME_FRICTION_IDS: List<String> = listOf(
        "tutorial.grill_line",
        "tutorial.plot_marker",
    )
}
