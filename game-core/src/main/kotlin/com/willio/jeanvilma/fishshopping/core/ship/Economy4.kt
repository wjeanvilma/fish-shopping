package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 17 — economy/bank/dashboard depth 4 ship contracts from
 * `shared/ship/economy-bank-4.json`.
 */
object Economy4 {
    const val PHASE = 17
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.economy_bank_4.v1"
    const val CATALOG = "shared/ship/economy-bank-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-economy-bank-4.json"
    const val MARKER = "authored-finish-6.0-phase-17"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val LOAN_PRODUCT_MIN = 7
    const val GOAL_PRESET_MIN = 16
    const val DASHBOARD_FIELD_COUNT = 6
    const val VALIDATE_SCRIPT = "economy4:validate"
    const val SOFT_ECONOMY_3_VALIDATE = "economy3:validate"
    const val CLOSES_GAP = "economy4Incomplete"
    const val EXTENDS_ECONOMY_3 = "shared/ship/economy-bank-3.json"

    val LOAN_PRODUCT_IDS: List<String> = listOf(
        "loan.starter",
        "loan.expansion",
        "loan.fleet",
        "loan.tideglass",
        "loan.aurora",
        "loan.nest_ember",
        "loan.saffron_crest",
    )

    val NEW_LOAN_PRODUCT_IDS: List<String> = listOf(
        "loan.nest_ember",
        "loan.saffron_crest",
    )

    val GOAL_PRESETS: List<Long> = listOf(
        150, 300, 600, 1200, 2400, 4800, 9600, 15000,
        22000, 32000, 45000, 60000, 80000, 110000, 150000, 200000,
    )

    val DASHBOARD_FIELDS: List<String> = listOf(
        "wageBurdenPermille",
        "loanCoveragePermille",
        "rivalLossCoins",
        "endgameSigilsEarned",
        "coinGoalsReached",
        "nestTreasuryLines",
    )
}
