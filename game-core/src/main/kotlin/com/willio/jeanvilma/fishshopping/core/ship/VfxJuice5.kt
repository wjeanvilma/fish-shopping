package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 12 — VFX juice 5 ship contracts from
 * `shared/ship/vfx-juice-5.json`.
 */
object VfxJuice5 {
    const val PHASE = 12
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.vfx_juice_5.v1"
    const val CATALOG = "shared/ship/vfx-juice-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-vfx-juice-5.json"
    const val VFX_JUICE_5_MARKER = "authored-finish-5.0-phase-12"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val EVENT_BURST_MIN = 5
    const val EVENT_SHAKE_MIN = 2
    const val PRESSURE_AMBIENT_MIN = 3
    const val VALIDATE_SCRIPT = "audiovfx5:validate"
    const val GAP_CLOSED = "audioVfx5Incomplete"
    const val RISING_PERMILLE = 700
    const val CRITICAL_PERMILLE = 1000
    const val CONTRACT_DEADLINE_WARN_TICKS = 200
    const val QUEST_NEAR_COMPLETE_PERMILLE = 800

    val EVENT_BURSTS = listOf(
        "cast_strike",
        "spoil",
        "machine_break",
        "contract_deadline",
        "quest_near",
    )

    val EVENT_SHAKES = listOf("cast_strike", "contract_deadline")

    val PRESSURE_AMBIENT_MODES = listOf("calm", "rising", "critical")
}
