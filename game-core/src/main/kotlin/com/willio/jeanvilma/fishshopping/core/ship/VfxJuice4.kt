package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 23 — VFX juice 4 ship contracts from
 * `shared/ship/vfx-juice-4.json`.
 */
object VfxJuice4 {
    const val PHASE = 23
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.vfx_juice_4.v1"
    const val CATALOG = "shared/ship/vfx-juice-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-vfx-juice-4.json"
    const val VFX_JUICE_4_MARKER = "authored-finish-4.0-phase-23"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val EVENT_BURST_MIN = 7
    const val EVENT_SHAKE_MIN = 2
    const val ENDGAME_AMBIENT_MIN = 3
    const val VALIDATE_SCRIPT = "audiovfx4:validate"

    val EVENT_BURSTS = listOf(
        "decor",
        "cosmetic",
        "endgame_tier",
        "endgame_challenge",
        "contract_accept",
        "bait",
        "full_unlock",
    )

    val EVENT_SHAKES = listOf("endgame_tier", "endgame_challenge")

    val ENDGAME_AMBIENT_MODES = listOf("locked", "active", "crowned")
}
