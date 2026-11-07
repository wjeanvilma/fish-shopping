package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 6 → Phase 30 — product LOC floors from
 * `shared/ship/loc-floors.json`. Phase 30 enforces freeze anti-regression
 * floors; plan targets are retained without padding.
 */
object LocFloors {
    const val PHASE = 6
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.loc_floors.v1"
    const val CATALOG = "shared/ship/loc-floors.json"
    const val SCHEMA_VERSION = 23
    const val METRIC_UNIT = "physical_lines"
    const val ENFORCE_FLOORS = true
    const val ENFORCE_AT_PHASE = 30
    const val ENFORCE_MODE = "freeze_anti_regression"

    const val GAME_CORE_ROOT = "game-core/src/main"
    const val APP_ROOT = "app/src/main"
    const val WEB_SRC_ROOT = "web/src"

    /** Freeze anti-regression floors (Phase 30). */
    const val GAME_CORE_FLOOR = 16_000
    const val APP_FLOOR = 10_000
    const val WEB_SRC_FLOOR = 24_000
    const val PRODUCT_TOTAL_FLOOR = 50_000

    /** Original Finish 2.0 plan targets (retained, not padded). */
    const val GAME_CORE_PLAN_TARGET = 25_000
    const val APP_PLAN_TARGET = 16_000
    const val WEB_SRC_PLAN_TARGET = 38_000
    const val PRODUCT_TOTAL_PLAN_TARGET = 80_000

    const val BASELINE_GAME_CORE = 13_276
    const val BASELINE_APP = 9_287
    const val BASELINE_WEB_SRC = 20_114
    const val BASELINE_PRODUCT_TOTAL = 42_677
}
