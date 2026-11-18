package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 23 — audio pack 4 ship contracts from
 * `shared/ship/audio-pack-4.json`.
 */
object AudioPack4 {
    const val PHASE = 23
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.audio_pack_4.v1"
    const val CATALOG = "shared/ship/audio-pack-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-audio-pack-4.json"
    const val AUDIO_PACK_MARKER = "authored-finish-4.0-phase-23"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val NEW_STINGER_MIN = 9
    const val NEW_BED_MIN = 2
    const val VALIDATE_SCRIPT = "audiovfx4:validate"

    val NEW_STINGERS = listOf(
        "decor",
        "cosmetic",
        "endgame_tier",
        "endgame_challenge",
        "contract_accept",
        "bait",
        "full_unlock",
        "machine_break",
        "spoil",
    )

    val NEW_BEDS = listOf("endgame", "ledger")
}
