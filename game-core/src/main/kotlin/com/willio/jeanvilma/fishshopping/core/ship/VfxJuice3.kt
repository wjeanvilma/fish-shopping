package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 24 — VFX/juice 3 ship constants
 * (mirrors shared/ship/vfx-juice-3.json).
 */
object VfxJuice3 {
    const val PHASE = 24
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.vfx_juice_3.v1"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val VFX_JUICE_3_MARKER = "authored-finish-3.0-phase-24"
    const val EVENT_BURST_MIN = 6
    const val EVENT_SHAKE_MIN = 2
    const val TIDE_AMBIENT_MIN = 4
    const val SIM_HZ_INVARIANT = 20
    const val MAX_SHAKE_AMPLITUDE_M = 0.12
    const val EXTENDS_CATALOG = "shared/perf/vfx-juice.json"
    const val EXTENDS_JUICE2_CATALOG = "shared/ship/vfx-juice-2.json"
    const val BUDGET_GATE_CATALOG = "shared/perf/budget-gate.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-vfx-juice-3.json"
    const val CATALOG = "shared/ship/vfx-juice-3.json"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"

    val EVENT_BURSTS = listOf(
        "rival_beat",
        "prestige",
        "trophy_set",
        "harbor_travel",
        "hire",
        "loan",
    )

    val EVENT_SHAKE = listOf("rival_beat", "prestige")

    val TIDE_PHASES = listOf("dawn", "day", "dusk", "night")
}
