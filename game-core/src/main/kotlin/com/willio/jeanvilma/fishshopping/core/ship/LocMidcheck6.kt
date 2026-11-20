package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 6 — LOC mid-check ship contracts from
 * `shared/ship/loc-midcheck-6.json`.
 */
object LocMidcheck6 {
    const val PHASE = 6
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.loc_midcheck_6.v1"
    const val CATALOG = "shared/ship/loc-midcheck-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-loc-midcheck-6.json"
    const val MARKER = "authored-finish-6.0-phase-6"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val VALIDATE_SCRIPT = "locmidcheck6:validate"

    const val PRIOR_PRODUCT_LOC = 90597
    const val MIDCHECK_PRODUCT_LOC = 92746
    const val INTERIM_PRODUCT_FLOOR = 92496
    const val PLAN_PRODUCT_LOC = 120000
    const val PRODUCT_PROGRESS_PERCENT = 7
    const val PRODUCT_PROGRESS_PERMILLE = 73
    const val MIDCHECK_SLACK_LINES = 500

    const val MIDCHECK_GAME_CORE_LOC = 32920
    const val MIDCHECK_APP_LOC = 15541
    const val MIDCHECK_WEB_SRC_LOC = 44285

    const val INTERIM_GAME_CORE_FLOOR = 32820
    const val INTERIM_APP_FLOOR = 15491
    const val INTERIM_WEB_SRC_FLOOR = 44185

    fun midcheckAligned(liveProduct: Int, slack: Int = MIDCHECK_SLACK_LINES): Boolean =
        liveProduct + slack >= MIDCHECK_PRODUCT_LOC

    fun meetsInterimFloor(liveProduct: Int): Boolean =
        liveProduct >= INTERIM_PRODUCT_FLOOR

    fun meetsPriorBaseline(liveProduct: Int): Boolean =
        liveProduct >= PRIOR_PRODUCT_LOC
}
