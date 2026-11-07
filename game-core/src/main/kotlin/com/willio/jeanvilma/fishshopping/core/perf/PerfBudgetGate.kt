package com.willio.jeanvilma.fishshopping.core.perf

/**
 * Phase 15 (post-1.0) — CI perf budget gate constants mirrored from
 * `shared/perf/budget-gate.json` / Phase 26 `device-matrix.json`.
 * Presentation-only; sim stays 20 Hz.
 */
object PerfBudgetGate {
    const val PHASE = 15
    const val SCHEMA = "fish.perf.budget_gate.v1"
    const val CATALOG = "shared/perf/budget-gate.json"
    const val PHASE26_CATALOG = "shared/perf/device-matrix.json"
    const val SIM_HZ = 20

    const val ANDROID_TARGET_FPS = 30
    const val WEB_TARGET_FPS = 60
    const val OVER_BUDGET_MULT = 1.15
    const val HARBOR_CACHE_LIMIT = 2
    const val WEB_MEDIUM_MAX_CSS_HEIGHT = 1080
    const val ANDROID_DOWNGRADE_STREAK = 45
    const val WEB_DOWNGRADE_STREAK = 90

    const val ANDROID_MEDIUM_MS = 33.3
    const val ANDROID_LOW_MS = 40.0
    const val WEB_MEDIUM_MS = 16.7
    const val WEB_LOW_MS = 22.2

    val CROWD_CAPS: Map<String, Int> = mapOf("low" to 3, "medium" to 5, "high" to 8)
    val FLY_CAPS: Map<String, Int> = mapOf("low" to 4, "medium" to 8, "high" to 12)
    val BURST_CAPS: Map<String, Int> = mapOf("low" to 2, "medium" to 4, "high" to 8)

    /** Phase 21 VFX juice shake scales (mirrored in budget-gate.json). */
    const val VFX_JUICE_PHASE = 21
    const val VFX_JUICE_CATALOG = "shared/perf/vfx-juice.json"
    const val MAX_SHAKE_AMPLITUDE_M = 0.12
    val SHAKE_SCALE: Map<String, Double> = mapOf("low" to 0.5, "medium" to 0.85, "high" to 1.0)

    fun overBudgetThresholdMs(targetMs: Double): Double = targetMs * OVER_BUDGET_MULT
}
