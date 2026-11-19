package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 26 — Deep links + E2E floors ≥12/≥14
 * (mirrors shared/ship/deeplink-e2e-5.json).
 */
object DeeplinkE2e5 {
    const val PHASE = 26
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.deeplink_e2e_5.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val DEEPLINK_E2E_5_MARKER = "authored-finish-5.0-phase-26"
    const val CLOSES_GAP = "deeplinkE2e5Thin"
    const val PANEL_ALIAS_FLOOR = 40
    const val HASH_ALIAS_FLOOR = 24
    const val MIN_ID_COUNT = 32
    const val MIN_TAG_COUNT = 32
    const val WEB_SCENARIO_FLOOR = 12
    const val COMPOSE_SCENARIO_FLOOR = 14
    const val URI_VECTOR_FLOOR = 12
    const val CATALOG = "shared/ship/deeplink-e2e-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-deeplink-e2e-5.json"
    const val VALIDATE_SCRIPT = "deeplinke2e5:validate"
    const val SOFT_DEEPLINK_E2E_4_VALIDATE = "deeplinke2e4:validate"
}
