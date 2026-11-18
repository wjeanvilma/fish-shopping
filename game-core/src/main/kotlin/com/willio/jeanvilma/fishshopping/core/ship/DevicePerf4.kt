package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 27 — Device/browser/perf matrix tighten
 * (mirrors shared/ship/device-perf-4.json).
 */
object DevicePerf4 {
    const val PHASE = 27
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.device_perf_4.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val DEVICE_PERF_4_MARKER = "authored-finish-4.0-phase-27"
    const val CLOSES_GAP = "devicePerfIncomplete"
    const val HARBOR_CACHE_FLOOR = 3
    const val OVER_BUDGET_MULT_MAX = 1.12
    const val UNDER_BUDGET_MULT = 0.85
    const val ANDROID_DEVICE_CLASS_FLOOR = 4
    const val ANDROID_SCENARIO_FLOOR = 7
    const val BROWSER_TARGET_FLOOR = 4
    const val BROWSER_SCENARIO_FLOOR = 7
    const val ANALYTICS_CONTRACT_TESTS_MIN = 3
    const val CATALOG = "shared/ship/device-perf-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-device-perf-4.json"
    const val VALIDATE_SCRIPT = "deviceperf4:validate"
}
