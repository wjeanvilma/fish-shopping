package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 26 — Analytics + loadtest banks expansion 6 ship contracts from
 * `shared/ship/analytics-loadtest-6.json`.
 */
object AnalyticsLoadtest6 {
    const val PHASE = 26
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.analytics_loadtest_6.v1"
    const val CATALOG = "shared/ship/analytics-loadtest-6.json"
    const val OPS_CATALOG = "shared/ops/analytics-loadtest-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-analytics-loadtest-6.json"
    const val MARKER = "authored-finish-6.0-phase-26"
    const val ANALYTICS_LOADTEST_6_MARKER = MARKER
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val EVENT_NAME_FLOOR = 11
    const val SOAK_SCENARIO_FLOOR = 8
    const val BANK_SCHEMA_VERSION_FLOOR = 27
    const val MIN_BYTES = 85_000_000L
    const val VALIDATE_SCRIPT = "analyticsloadtest6:validate"
    const val SOFT_REMOTE_ANALYTICS_VALIDATE = "remoteanalytics:validate"
    const val CLOSES_GAP = "loadtestBanksIncomplete"
    const val EXTENDS_LOADTEST_BANKS = "shared/ship/loadtest-banks.json"

    val NEST_EVENTS: List<String> = listOf(
        "nest_sigil_earned",
        "nest_contract_settled",
        "loadtest_bank_probed",
    )
}
