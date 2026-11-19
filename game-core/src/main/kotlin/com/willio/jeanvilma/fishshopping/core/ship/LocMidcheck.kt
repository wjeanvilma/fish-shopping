package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 6 — LOC mid-check ship contracts from
 * `shared/ship/loc-midcheck.json`.
 */
object LocMidcheck {
    const val PHASE = 6
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.loc_midcheck.v1"
    const val CATALOG = "shared/ship/loc-midcheck.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-loc-midcheck.json"
    const val MARKER = "authored-finish-5.0-phase-6"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val VALIDATE_SCRIPT = "locmidcheck:validate"

    const val PRIOR_PRODUCT_LOC = 80175
    const val MIDCHECK_PRODUCT_LOC = 82280
    const val INTERIM_PRODUCT_FLOOR = 82000
    const val PLAN_PRODUCT_LOC = 120000
    const val PRODUCT_PROGRESS_PERCENT = 5
    const val MIDCHECK_SLACK_LINES = 500

    const val MIDCHECK_GAME_CORE_LOC = 28908
    const val MIDCHECK_APP_LOC = 14845
    const val MIDCHECK_WEB_SRC_LOC = 38527
}
