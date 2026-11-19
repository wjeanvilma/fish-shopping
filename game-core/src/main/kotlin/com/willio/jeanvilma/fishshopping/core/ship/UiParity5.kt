package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 23 — Web↔Android panel parity depth 5 ship contracts from
 * `shared/ship/ui-parity-5.json`.
 */
object UiParity5 {
    const val PHASE = 23
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.ui_parity_5.v1"
    const val CATALOG = "shared/ship/ui-parity-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-ui-parity-5.json"
    const val MARKER = "authored-finish-5.0-phase-23"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val PANEL_PAIR_MIN = 14
    const val FEATURE_FLOOR_MIN = 18
    const val GOAL_PRESET_MIN = 12
    const val LOAN_PRODUCT_MIN = 5
    const val DAILY_OBJECTIVE_MIN = 14
    const val VALIDATE_SCRIPT = "uiparity5:validate"
    const val SOFT_UI_PARITY_VALIDATE = "uiparity:validate"
    const val CLOSES_GAP = "uiParity5Incomplete"
    const val EXTENDS_UI_PARITY = "shared/ship/ui-parity-depth.json"

    val NEW_PANEL_PAIR_IDS: List<String> = listOf(
        "hud_chrome",
        "hud_shell",
    )

    val NEW_FEATURE_FLOOR_IDS: List<String> = listOf(
        "weekly_goals_claim",
        "endgame_board",
        "tutorial_friction_nudge",
        "dashboard_ledger",
        "cloud_conflict_severity",
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
    )
}
