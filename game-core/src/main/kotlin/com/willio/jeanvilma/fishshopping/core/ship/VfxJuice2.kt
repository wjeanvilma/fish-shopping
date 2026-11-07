package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 22 — VFX/juice 2 ship constants
 * (mirrors shared/ship/vfx-juice-2.json).
 */
object VfxJuice2 {
    const val PHASE = 22
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.vfx_juice_2.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val VFX_JUICE_2_MARKER = "authored-finish-2.0-phase-22"
    const val EVENT_BURST_MIN = 4
    const val EVENT_SHAKE_MIN = 2
    const val WEATHER_AMBIENT_MIN = 5
    const val PARITY_FIXTURE = "shared/fixtures/parity-vfx-juice-2.json"
    const val CATALOG = "shared/ship/vfx-juice-2.json"
    const val EXTENDS_CATALOG = "shared/perf/vfx-juice.json"
    const val BUDGET_GATE_CATALOG = "shared/perf/budget-gate.json"
    const val SIM_HZ_INVARIANT = 20
    const val MAX_SHAKE_AMPLITUDE_M = 0.12

    val EVENT_BURSTS = listOf("achievement", "festival", "contract_done", "goal_claim")
    val EVENT_SHAKE = listOf("achievement", "festival")
    val WEATHER_PATTERNS = listOf(
        "weather.clear",
        "weather.overcast",
        "weather.rain",
        "weather.fog",
        "weather.gale",
    )
}
