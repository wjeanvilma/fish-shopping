package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 21 — economy/bank/dashboard depth 3 ship contracts from
 * `shared/ship/economy-bank-3.json`.
 */
object Economy3 {
    const val PHASE = 21
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.economy_bank_3.v1"
    const val CATALOG = "shared/ship/economy-bank-3.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-economy-bank-3.json"
    const val MARKER = "authored-finish-5.0-phase-21"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val LOAN_PRODUCT_MIN = 5
    const val GOAL_PRESET_MIN = 12
    const val DASHBOARD_FIELD_COUNT = 8
    const val VALIDATE_SCRIPT = "economy3:validate"
    const val SOFT_ECONOMY_2_VALIDATE = "economy2:validate"
    const val CLOSES_GAP = "economy3Incomplete"
    const val EXTENDS_ECONOMY_2 = "shared/ship/economy-bank-2.json"

    val LOAN_PRODUCT_IDS: List<String> = listOf(
        "loan.starter",
        "loan.expansion",
        "loan.fleet",
        "loan.tideglass",
        "loan.aurora",
    )

    val NEW_LOAN_PRODUCT_IDS: List<String> = listOf(
        "loan.tideglass",
        "loan.aurora",
    )

    val GOAL_PRESETS: List<Long> = listOf(
        150, 300, 600, 1200, 2400, 4800, 9600, 15000, 22000, 32000, 45000, 60000,
    )

    val DASHBOARD_FIELDS: List<String> = listOf(
        "loanOwed",
        "loansTaken",
        "loanRepaid",
        "coinGoal",
        "coinGoalProgressPermille",
        "ledgerNetCashflow",
        "contractRevenueSharePermille",
        "ledgerLines",
    )
}
