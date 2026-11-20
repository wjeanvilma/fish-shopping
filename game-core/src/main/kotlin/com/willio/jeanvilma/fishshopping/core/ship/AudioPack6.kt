package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 12 — audio pack 6 ship contracts from
 * `shared/ship/audio-pack-6.json`.
 */
object AudioPack6 {
    const val PHASE = 12
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.audio_pack_6.v1"
    const val CATALOG = "shared/ship/audio-pack-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-audio-pack-6.json"
    const val AUDIO_PACK_MARKER = "authored-finish-6.0-phase-12"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val NEW_STINGER_MIN = 5
    const val NEW_BED_MIN = 1
    const val VALIDATE_SCRIPT = "audiovfx6:validate"
    const val GAP_CLOSED = "audioVfx6Incomplete"

    val NEW_STINGERS = listOf(
        "nest_settle",
        "roast_ready",
        "ferment_ready",
        "school_flash",
        "aurora_crest",
    )

    val NEW_BEDS = listOf("nest")
}
