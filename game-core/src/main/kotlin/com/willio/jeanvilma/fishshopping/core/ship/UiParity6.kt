package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 20 — Web↔Android panel parity depth 6 ship constants
 * (mirrors shared/ship/ui-parity-6.json).
 */
object UiParity6 {
    const val PHASE = 20
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.ui_parity_6.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val UI_PARITY_6_MARKER = "authored-finish-6.0-phase-20"
    const val CATALOG = "shared/ship/ui-parity-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-ui-parity-6.json"
    const val PANEL_PAIR_MIN = 16
    const val FEATURE_FLOOR_MIN = 23
    const val GOAL_PRESET_MIN = 16
    const val LOAN_PRODUCT_MIN = 7
    const val DAILY_OBJECTIVE_MIN = 18
    const val SIM_HZ_INVARIANT = 20
    const val VALIDATE_SCRIPT = "uiparity6:validate"
    const val SOFT_UI_PARITY_5_VALIDATE = "uiparity5:validate"
    const val CLOSES_GAP = "uiParity6Incomplete"

    val NEW_PANEL_PAIR_IDS: List<String> = listOf(
        "hud_primitives",
        "joystick",
    )

    val NEW_FEATURE_FLOOR_IDS: List<String> = listOf(
        "nest_treasury",
        "nest_conflict_hint",
        "staff_branch_schedule",
        "nest_loan_products",
        "offline_nest_journal",
    )

    val FEATURE_FLOOR_IDS: List<String> = listOf(
        "bank_loan_products",
        "bank_goal_presets",
        "daily_goals_claim",
        "cosmetics_equip",
        "dashboard_cashflow",
        "dashboard_journal",
        "staff_train_reason",
        "cloud_conflict",
        "offline_journal",
        "map_specialty",
        "contracts_reputation",
        "hud_rival",
        "licenses",
        "weekly_goals_claim",
        "endgame_board",
        "tutorial_friction_nudge",
        "dashboard_ledger",
        "cloud_conflict_severity",
    ) + NEW_FEATURE_FLOOR_IDS
}
