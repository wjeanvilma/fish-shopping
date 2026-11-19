package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 12 — audio pack 5 ship contracts from
 * `shared/ship/audio-pack-5.json`.
 */
object AudioPack5 {
    const val PHASE = 12
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.audio_pack_5.v1"
    const val CATALOG = "shared/ship/audio-pack-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-audio-pack-5.json"
    const val AUDIO_PACK_MARKER = "authored-finish-5.0-phase-12"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val NEW_STINGER_MIN = 5
    const val NEW_BED_MIN = 1
    const val VALIDATE_SCRIPT = "audiovfx5:validate"
    const val GAP_CLOSED = "audioVfx5Incomplete"

    val NEW_STINGERS = listOf(
        "cast_strike",
        "spoil_warn",
        "service_queue",
        "contract_deadline",
        "quest_near",
    )

    val NEW_BEDS = listOf("pressure")
}
