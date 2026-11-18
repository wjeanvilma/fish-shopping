package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 22 — Web↔Android panel feature parity depth ship contracts from
 * `shared/ship/ui-parity-depth.json`.
 */
object UiParity {
    const val PHASE = 22
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.ui_parity_depth.v1"
    const val CATALOG = "shared/ship/ui-parity-depth.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-ui-parity-depth.json"
    const val MARKER = "authored-finish-4.0-phase-22"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val PANEL_PAIR_MIN = 12
    const val FEATURE_FLOOR_MIN = 13
    const val GOAL_PRESET_MIN = 8
    const val LOAN_PRODUCT_MIN = 3
    const val DAILY_OBJECTIVE_MIN = 10
    const val VALIDATE_SCRIPT = "uiparity:validate"

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
    )
}
