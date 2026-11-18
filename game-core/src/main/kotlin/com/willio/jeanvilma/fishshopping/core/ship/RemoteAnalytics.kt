package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 26 — remote analytics ship constants
 * (mirrors shared/ship/remote-analytics.json).
 */
object RemoteAnalytics {
    const val PHASE = 26
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.remote_analytics.v1"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val REMOTE_ANALYTICS_MARKER = "authored-finish-3.0-phase-26"
    const val POLICY_CATALOG = "shared/ops/remote-analytics-sink.json"
    const val EXTENDS_DASHBOARD = "shared/ops/analytics-dashboard.json"
    const val CATALOG = "shared/ship/remote-analytics.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-remote-analytics.json"
    const val MODULE_ROOT = "analytics-api/"
    const val LOCAL_EMULATOR_DEFAULT_BASE = "http://localhost:8788"
    const val CLIENT_ENV_KEY = "VITE_ANALYTICS_API_BASE"
    const val ANDROID_META_KEY = "fish.analytics.apiBase"
    const val BATCH_MAX_EVENTS_MIN = 10
    const val EVENT_NAME_MIN = 8
    const val SIM_HZ_INVARIANT = 20
}
