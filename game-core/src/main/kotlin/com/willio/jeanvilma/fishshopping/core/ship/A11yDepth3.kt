package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 24 — a11y depth 3 ship constants
 * (mirrors shared/ship/a11y-depth-3.json).
 */
object A11yDepth3 {
    const val PHASE = 24
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.a11y_depth_3.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val A11Y_DEPTH_3_MARKER = "authored-finish-4.0-phase-24"
    const val SCREEN_SURFACE_MIN = 5
    const val CONTRAST_PAIR_MIN = 2
    const val UI_A11Y_STRING_KEY_MIN = 20
    const val LIVE_REGION_MIN = 2
    const val SIM_HZ_INVARIANT = 20
    const val PARITY_FIXTURE = "shared/fixtures/parity-a11y-depth-3.json"
    const val CATALOG = "shared/ship/a11y-depth-3.json"
    const val DEPTH_CATALOG = "shared/a11y/accessibility-depth-3.json"
    const val EXTENDS_CATALOG = "shared/a11y/accessibility-depth-2.json"
    const val VALIDATE_SCRIPT = "a11yi18n4:validate"
}
