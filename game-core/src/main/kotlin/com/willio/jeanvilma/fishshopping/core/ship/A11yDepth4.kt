package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 24 — a11y depth 4 ship contracts from
 * `shared/ship/a11y-depth-4.json`.
 */
object A11yDepth4 {
    const val PHASE = 24
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.a11y_depth_4.v1"
    const val CATALOG = "shared/ship/a11y-depth-4.json"
    const val DEPTH_CATALOG = "shared/a11y/accessibility-depth-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-a11y-depth-4.json"
    const val MARKER = "authored-finish-5.0-phase-24"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val SCREEN_SURFACE_MIN = 5
    const val CONTRAST_PAIR_MIN = 2
    const val UI_A11Y_STRING_KEY_MIN = 30
    const val LIVE_REGION_MIN = 2
    const val VALIDATE_SCRIPT = "a11yi18n5:validate"
    const val SOFT_A11Y_I18N_4_VALIDATE = "a11yi18n4:validate"
    const val CLOSES_GAP = "a11yI18n5Incomplete"
}
