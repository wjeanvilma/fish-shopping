package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 6 → Finish 5.0 Phase 30 — product LOC floors from
 * `shared/ship/loc-floors.json`. Phase 30 enforces Finish 5.0 freeze
 * anti-regression floors; plan targets are retained without padding.
 */
object LocFloors {
    const val PHASE = 6
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.loc_floors.v1"
    const val CATALOG = "shared/ship/loc-floors.json"
    const val SCHEMA_VERSION = 26
    const val METRIC_UNIT = "physical_lines"
    const val ENFORCE_FLOORS = true
    const val ENFORCE_AT_PHASE = 30
    const val ENFORCE_MODE = "freeze_anti_regression"

    const val GAME_CORE_ROOT = "game-core/src/main"
    const val APP_ROOT = "app/src/main"
    const val WEB_SRC_ROOT = "web/src"

    /** Finish 5.0 freeze anti-regression floors (Phase 30). */
    const val GAME_CORE_FLOOR = 32_000
    const val APP_FLOOR = 15_200
    const val WEB_SRC_FLOOR = 42_500
    const val PRODUCT_TOTAL_FLOOR = 90_000

    /** Finish 5.0 plan targets (not padded). */
    const val GAME_CORE_PLAN_TARGET = 38_000
    const val APP_PLAN_TARGET = 26_000
    const val WEB_SRC_PLAN_TARGET = 56_000
    const val PRODUCT_TOTAL_PLAN_TARGET = 120_000
    /** Finish 4.0 historical plan targets / freeze floors (soft floor for prior validators). */
    const val FINISH4_HISTORICAL_GAME_CORE_PLAN_TARGET = 32_000
    const val FINISH4_HISTORICAL_APP_PLAN_TARGET = 20_000
    const val FINISH4_HISTORICAL_WEB_SRC_PLAN_TARGET = 48_000
    const val FINISH4_HISTORICAL_PRODUCT_TOTAL_PLAN_TARGET = 100_000
    const val FINISH4_HISTORICAL_GAME_CORE_FLOOR = 23_500
    const val FINISH4_HISTORICAL_APP_FLOOR = 13_800
    const val FINISH4_HISTORICAL_WEB_SRC_FLOOR = 35_600
    const val FINISH4_HISTORICAL_PRODUCT_TOTAL_FLOOR = 73_100

    const val BASELINE_GAME_CORE = 13_276
    const val BASELINE_APP = 9_287
    const val BASELINE_WEB_SRC = 20_114
    const val BASELINE_PRODUCT_TOTAL = 42_677
}
