package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 27 — Device/browser/perf matrix 5
 * (mirrors shared/ship/device-perf-5.json).
 */
object DevicePerf5 {
    const val PHASE = 27
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.device_perf_5.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val DEVICE_PERF_5_MARKER = "authored-finish-5.0-phase-27"
    const val CLOSES_GAP = "devicePerf5Incomplete"
    const val HARBOR_CACHE_FLOOR = 4
    const val OVER_BUDGET_MULT_MAX = 1.12
    const val UNDER_BUDGET_MULT = 0.85
    const val ANDROID_DEVICE_CLASS_FLOOR = 5
    const val ANDROID_SCENARIO_FLOOR = 9
    const val BROWSER_TARGET_FLOOR = 5
    const val BROWSER_SCENARIO_FLOOR = 9
    const val ANALYTICS_CONTRACT_TESTS_MIN = 4
    const val CATALOG = "shared/ship/device-perf-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-device-perf-5.json"
    const val VALIDATE_SCRIPT = "deviceperf5:validate"
    const val SOFT_DEVICE_PERF_4_VALIDATE = "deviceperf4:validate"
}
