package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 24 — Compose instrumented floors ≥20
 * (mirrors shared/ship/compose-e2e-6.json).
 */
object ComposeE2e6 {
    const val PHASE = 24
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.compose_e2e_6.v1"
    const val CATALOG = "shared/ship/compose-e2e-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-compose-e2e-6.json"
    const val MARKER = "authored-finish-6.0-phase-24"
    const val COMPOSE_E2E_6_MARKER = MARKER
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val CLOSES_GAP = "composeE2eThin"
    const val VALIDATE_SCRIPT = "npm run composee2e6:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-6.0-kickoff.json"
    const val SCENARIO_FLOOR = 20
    const val TAG_COUNT_FLOOR = 40
    const val SOFT_COMPOSE_SCENARIO_FLOOR = 14
    const val SOFT_MIN_TAG_COUNT = 32
}
