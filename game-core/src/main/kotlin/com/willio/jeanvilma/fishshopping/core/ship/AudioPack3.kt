package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 23 — SFX/music pack 3 ship constants
 * (mirrors shared/ship/audio-pack-3.json).
 */
object AudioPack3 {
    const val PHASE = 23
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.audio_pack_3.v1"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val AUDIO_PACK_MARKER = "authored-finish-3.0-phase-23"
    const val NEW_STINGER_MIN = 8
    const val NEW_BED_MIN = 2
    const val PARITY_FIXTURE = "shared/fixtures/parity-audio-pack-3.json"
    const val CATALOG = "shared/ship/audio-pack-3.json"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"

    val NEW_STINGERS = listOf(
        "rival_open",
        "rival_steal",
        "rival_beat",
        "harbor_travel",
        "hire",
        "prestige",
        "loan",
        "trophy_set",
    )

    val NEW_BEDS = listOf("night", "rival")
}
