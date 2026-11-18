package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 20 — economy/bank/dashboard depth ship contracts from
 * `shared/ship/economy-bank-2.json`.
 */
object Economy2 {
    const val PHASE = 20
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.economy_bank_2.v1"
    const val CATALOG = "shared/ship/economy-bank-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-economy-bank-2.json"
    const val MARKER = "authored-finish-4.0-phase-20"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val LOAN_PRODUCT_MIN = 3
    const val GOAL_PRESET_MIN = 8
    const val DASHBOARD_FIELD_COUNT = 10
    const val VALIDATE_SCRIPT = "economy2:validate"

    val LOAN_PRODUCT_IDS: List<String> = listOf(
        "loan.starter",
        "loan.expansion",
        "loan.fleet",
    )

    val GOAL_PRESETS: List<Long> = listOf(150, 300, 600, 1200, 2400, 4800, 9600, 15000)

    val SCARCITY_CURVE: List<Int> = listOf(1250, 1160, 1080, 1000, 970)

    val DASHBOARD_FIELDS: List<String> = listOf(
        "maintenancePaid",
        "repairSpent",
        "itemsSpoiled",
        "loanInterestAccrued",
        "loanCollected",
        "operatingCosts",
        "netOperatingProfit",
        "activeScarcityTipPermille",
        "reputationScorePermille",
        "reputationLabel",
    )
}
