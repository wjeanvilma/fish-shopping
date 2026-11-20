package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 19 — tutorial friction + retention hooks 6 ship constants
 * (mirrors shared/ship/tutorial-retention-6.json).
 */
object TutorialRetention6 {
    const val PHASE = 19
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.tutorial_retention_6.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val TUTORIAL_RETENTION_6_MARKER = "authored-finish-6.0-phase-19"
    const val CATALOG = "shared/ship/tutorial-retention-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-tutorial-retention-6.json"
    const val TUTORIAL_STEPS_MIN = 13
    const val HIGH_FRICTION_MIN = 9
    const val NUDGES_MIN = 9
    const val DAILY_OBJECTIVES_MIN = 18
    const val BOARD_SLOTS_MIN = 6
    const val WEEKLY_OBJECTIVES_MIN = 6
    const val WEEKLY_BOARD_SLOTS_MIN = 3
    const val MAX_STREAK_BONUS_DAYS_MIN = 21
    const val SIM_HZ_INVARIANT = 20
    const val VALIDATE_SCRIPT = "tutorialretention6:validate"
    const val SOFT_TUTORIAL_RETENTION_5_VALIDATE = "tutorialretention5:validate"
    const val CLOSES_GAP = "tutorialRetention6Incomplete"

    val NEW_DAILY_OBJECTIVE_IDS: List<String> = listOf(
        "daily.roast_plate",
        "daily.nest_haul",
        "daily.ember_loan",
        "daily.sigil_seek",
    )

    val NEW_WEEKLY_OBJECTIVE_IDS: List<String> = listOf(
        "weekly.nest_ember",
        "weekly.saffron_circuit",
    )

    val NEW_TUTORIAL_STEP_IDS: List<String> = listOf(
        "tutorial.roast_nest",
        "tutorial.ferment_line",
    )

    val MID_GAME_FRICTION_IDS: List<String> = listOf(
        "tutorial.roast_nest",
        "tutorial.ferment_line",
    )
}
