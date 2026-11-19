package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 23 — Playwright E2E floors ≥24
 * (mirrors shared/ship/playwright-e2e-6.json).
 */
object PlaywrightE2e6 {
    const val PHASE = 23
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.playwright_e2e_6.v1"
    const val CATALOG = "shared/ship/playwright-e2e-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-playwright-e2e-6.json"
    const val MARKER = "authored-finish-6.0-phase-23"
    const val PLAYWRIGHT_E2E_6_MARKER = MARKER
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val CLOSES_GAP = "e2eDepthThin"
    const val VALIDATE_SCRIPT = "npm run playwrighte2e6:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-6.0-kickoff.json"
    const val SCENARIO_FLOOR = 24
    const val ID_COUNT_FLOOR = 40
    const val NEST_ALIAS_MIN = 8
    const val SOFT_WEB_SCENARIO_FLOOR = 12
    const val SOFT_MIN_ID_COUNT = 32
}
