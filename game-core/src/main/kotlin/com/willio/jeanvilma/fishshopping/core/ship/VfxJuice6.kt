package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 12 — VFX juice 6 ship contracts from
 * `shared/ship/vfx-juice-6.json`.
 */
object VfxJuice6 {
    const val PHASE = 12
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.vfx_juice_6.v1"
    const val CATALOG = "shared/ship/vfx-juice-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-vfx-juice-6.json"
    const val VFX_JUICE_6_MARKER = "authored-finish-6.0-phase-12"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val EVENT_BURST_MIN = 5
    const val EVENT_SHAKE_MIN = 2
    const val NEST_AMBIENT_MIN = 3
    const val VALIDATE_SCRIPT = "audiovfx6:validate"
    const val GAP_CLOSED = "audioVfx6Incomplete"
    const val ROOSTING_MIN_PLACEMENTS = 1
    const val SETTLED_MIN_PLACEMENTS = 3

    val EVENT_BURSTS = listOf(
        "nest_settle",
        "roast_ready",
        "ferment_ready",
        "school_flash",
        "aurora_crest",
    )

    val EVENT_SHAKES = listOf("nest_settle", "aurora_crest")

    val NEST_AMBIENT_MODES = listOf("idle", "roosting", "settled")
}
