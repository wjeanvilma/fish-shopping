package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 28 — Device/browser/perf matrix 6 ship constants
 * (mirrors shared/ship/device-perf-6.json).
 */
object DevicePerf6 {
    const val PHASE = 28
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.device_perf_6.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val DEVICE_PERF_6_MARKER = "authored-finish-6.0-phase-28"
    const val CLOSES_GAP = "devicePerf6Incomplete"
    const val CATALOG = "shared/ship/device-perf-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-device-perf-6.json"
    const val PERF_MATRIX = "shared/perf/device-matrix.json"
    const val BUDGET_GATE = "shared/perf/budget-gate.json"
    const val ANDROID_MATRIX = "shared/lifecycle/android-device-matrix.json"
    const val BROWSER_MATRIX = "shared/lifecycle/browser-matrix.json"
    const val HARBOR_CACHE_FLOOR = 5
    const val ANDROID_CLASS_FLOOR = 6
    const val ANDROID_SCENARIO_FLOOR = 11
    const val BROWSER_TARGET_FLOOR = 6
    const val BROWSER_SCENARIO_FLOOR = 11
    const val ANALYTICS_CONTRACT_TESTS_MIN = 5
    const val FLYING_TRANSFER_POOL_FLOOR = 20
    const val VALIDATE_SCRIPT = "deviceperf6:validate"
    const val SOFT_DEVICE_PERF_5_VALIDATE = "deviceperf5:validate"
}
