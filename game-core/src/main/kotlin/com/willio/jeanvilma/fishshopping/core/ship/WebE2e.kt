package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 22 — Web Playwright E2E smoke
 * (mirrors shared/ship/web-e2e.json).
 */
object WebE2e {
    const val PHASE = 22
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.web_e2e.v1"
    const val CATALOG = "shared/ship/web-e2e.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-web-e2e.json"
    const val MARKER = "authored-finish-3.0-phase-22"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val CLOSES_GAP = "webE2eMissing"
    const val VALIDATE_SCRIPT = "npm run webe2e:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val IDS_MODULE = "web/src/e2e/webE2eIds.ts"
    const val PLAYWRIGHT_CONFIG = "web/playwright.config.ts"
    const val SMOKE_SPEC = "web/e2e/smoke.spec.ts"
    const val NPM_SCRIPT = "e2e:smoke"
    /** Finish 5.0 Phase 26 soft-floor (was 24). */
    const val MIN_ID_COUNT = 32
}
