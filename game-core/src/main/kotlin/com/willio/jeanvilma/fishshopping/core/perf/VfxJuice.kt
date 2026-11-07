package com.willio.jeanvilma.fishshopping.core.perf

/**
 * Phase 21 (post-1.0) — VFX juice contracts from `shared/perf/vfx-juice.json`.
 * Catch/cut/sale feedback + shake caps under the Phase 15 budget gate.
 */
object VfxJuice {
    const val PHASE = 21
    const val SCHEMA = "fish.perf.vfx_juice.v1"
    const val CATALOG = "shared/perf/vfx-juice.json"
    const val BUDGET_GATE = "shared/perf/budget-gate.json"
    const val SIM_HZ = 20
    const val SHAKE_DURATION_S = 0.18
    const val MAX_SHAKE_AMPLITUDE_M = 0.12

    val BURST_KINDS: List<String> = listOf("catch", "pay", "celebrate", "machine_done")
    val SHAKE_KINDS: List<String> = listOf("catch", "cut", "sale", "celebrate")
    val BURST_CAPS: Map<String, Int> = mapOf("low" to 2, "medium" to 4, "high" to 8)
    val FLY_CAPS: Map<String, Int> = mapOf("low" to 4, "medium" to 8, "high" to 12)
    val SHAKE_SCALE: Map<String, Double> = mapOf("low" to 0.5, "medium" to 0.85, "high" to 1.0)
    val SHAKE_AMPLITUDE_M: Map<String, Double> = mapOf(
        "catch" to 0.04,
        "cut" to 0.03,
        "sale" to 0.05,
        "celebrate" to 0.08,
    )

    fun cappedShakeAmplitudeM(kind: String, quality: String): Double {
        val base = SHAKE_AMPLITUDE_M[kind] ?: return 0.0
        val scale = SHAKE_SCALE[quality] ?: 1.0
        return minOf(MAX_SHAKE_AMPLITUDE_M, maxOf(0.0, base * scale))
    }
}
